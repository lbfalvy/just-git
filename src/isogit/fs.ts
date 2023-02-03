import * as ig from 'isomorphic-git';
import * as efs from 'expo-file-system';
import { base64ToBytes, bytesToBase64 } from './base64';

// Remove trailing slash if not toplevel
function normalize(path: string): string {
  if (!path.endsWith('/') || path.endsWith('//')) return path;
  return path.slice(0, -1);
}

// Remove a segment from the path if possible
function popSegment(path: string): [string, string] {
  if (path.endsWith('/')) throw new Error('Cannot pop top-level path');
  const idx = path.lastIndexOf('/');
  return [path.slice(0, idx), path.slice(idx + 1)];
}

// Add a segment to the path
function pushSegment(path: string, segment: string): string {
  if (path.endsWith('/')) return `${path}${segment}`;
  else return `${path}/${segment}`;
}

function pathToString(path: string | URL | unknown): string {
  let str: string
  if (typeof path == 'string') str = path;
  else if (path instanceof URL) str = path.toString();
  else throw new Error('Unrecognized path parameter type');
  return normalize(str);
}

interface NodeTypeFunctions {
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isDirectory(): boolean;
  isFIFO(): boolean;
  isFile(): boolean;
  isSocket(): boolean;
  isSymbolicLink(): boolean;
}

// From the Node documentation.
// Binary filenames aren't supported.
interface Dirent extends NodeTypeFunctions {
  name: string;
}

type StatsNum<B extends boolean> =
  | true extends B ? bigint : never
  | false extends B ? number : never; 

type Stats<B extends boolean> = 
& Record<`${'u'|'g'}id`, StatsNum<B>>
& Record<`${'a'|'m'|'c'|'birth'}time`, Date>
& Record<`${'a'|'m'|'c'|'birth'}timeMs`, StatsNum<B>>
& Partial<Record<`${'a'|'m'|'c'|'birth'}timeNs`, bigint>>
& NodeTypeFunctions
& {
  dev: StatsNum<B>;
  ino: StatsNum<B>;
  mode: StatsNum<B>;
  nlink: StatsNum<B>;
  rdev: StatsNum<B>;
  size: StatsNum<B>;
  blksize: StatsNum<B>;
  blocks: StatsNum<B>;
};

const unsupportedNodeTypes = {
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  isSymbolicLink: () => false,
} as const;

function bannedFields<T, K extends string>(t: T, keys: readonly K[]): T & Record<K, any> {
  return Object.defineProperties(t, Object.fromEntries(keys.map(key => [key, {
    configurable: false,
    enumerable: false,
    get: () => { throw new Error(`${key} is a forbidden field`) }
  } as PropertyDescriptor] as const)) as Record<K, PropertyDescriptor>) as any
}

export const fs: ig.PromiseFsClient = {
  promises: {
    /* We don't support filemodes.
    throws if the path exists, unless it points to a directory and recursive is true.
    returns the first (topmost) newly created directory if recursive is true, otherwise undefined.
    */
    async mkdir(
      rawPath: string|URL,
      options?: { recursive?: boolean }
    ): Promise<string | undefined> {
      const recursive = options?.recursive ?? false;
      const path = pathToString(rawPath);
      console.debug(`mkdir ${path} ${recursive ? 'true' : 'false'}`)
      const stat = await efs.getInfoAsync(path);
      if (stat.exists) {
        if (!recursive) throw new Error('Directory already exists');
        if (!stat.isDirectory) throw new Error('The path points to a file');
        return undefined;
      } else {
        let firstCreated: string|undefined;
        if (recursive) {
          const [parent, _] = popSegment(path);
          firstCreated = await fs.promises.mkdir(parent, { recursive: true });
        }
        await efs.makeDirectoryAsync(path);
        if (recursive) return firstCreated ?? path;
        return undefined;
      }
    },
    // We don't support symlinks, for everything else lstat == stat
    lstat: (...args: any[]) => fs.promises.stat(...args),
    /* If types are requested we need to query each entry as well. */
    async readdir(
      rawPath: string|URL,
      options?: string | { encoding?: string,  withFileTypes?: boolean }
    ) {
      const path = normalize(pathToString(rawPath));
      const encoding = (typeof options == 'string' ? options : options?.encoding) ?? 'utf8';
      if (encoding !== 'utf8') throw new Error('Only utf8 is supported');
      const withFileTypes = (typeof options == 'object' && options.withFileTypes) || false;
      console.debug(`ls ${path}`);
      const names = await efs.readDirectoryAsync(path);
      if (!withFileTypes) return names;
      return await Promise.all(names.map(async name => {
        const fullPath = pushSegment(path, name);
        const info = await efs.getInfoAsync(fullPath)
        return {
          name,
          isDirectory: () => info.isDirectory,
          isFile: () => info.exists && !info.isDirectory,
          // Our targets don't support any of these
          ...unsupportedNodeTypes
        } satisfies Dirent;
      }))
    },
    /* Handles and buffers aren't supported as sources.
    Buffer encoding isn't supported. */
    async readFile(
      rawPath: string | URL,
      options?: string | { encoding?: string, flag?: string }
    ): Promise<string | Uint8Array> {
      const path = pathToString(rawPath);
      const encoding = (typeof options == 'string' ? options : options?.encoding) ?? 'utf8';
      console.debug(`cat -enc ${encoding} ${path}`);
      if (!encoding) {
        const b64Data = await efs.readAsStringAsync(path, { encoding: 'base64' });
        return base64ToBytes(b64Data);
      }
      return await efs.readAsStringAsync(path, { encoding: encoding as any });
    },
    async rmdir(
      rawPath: string | URL,
      options?: { recursive?: boolean }
    ): Promise<void> {
      const recursive = options?.recursive ?? false;
      const path = pathToString(rawPath);
      console.debug(`rmdir ${recursive ? '-r ' : ''} ${path}`)
      const entries = await efs.readDirectoryAsync(path);
      if (!recursive && 0 < entries.length) throw new Error("Directory not empty");
      await efs.deleteAsync(path);
    },
    async stat<B extends boolean>(
      rawPath: string | URL,
      options?: { bigint?: B }
    ): Promise<Stats<B> | undefined> {
      const path = pathToString(rawPath);
      const bigint = options?.bigint ?? false;
      console.debug(`stat ${path}`)
      const info = await efs.getInfoAsync(path, { md5: false, size: true });
      console.debug(!info.exists ? 'missing' : `exists;${
        info.size.toLocaleString(undefined, { useGrouping: true })
      }b`);
      if (!info.exists) throw Object.assign(new Error('File does not exist'), { code: 'ENOENT' });
      const unixS = info.modificationTime ?? 0;
      const unixMs = unixS * 1000;
      const extension = bigint ? {
        atimeNs: BigInt(unixS) * BigInt(1000_0000),
        mtimeNs: BigInt(unixS) * BigInt(1000_0000),
        ctimeNs: BigInt(unixS) * BigInt(1000_0000),
        birthtimeNs: BigInt(unixS) * BigInt(1000_0000),
      } as const : {};
      const cast: (n: number) => any = bigint ? BigInt : x => x;
      return bannedFields({
        atime: new Date(unixMs),
        mtime: new Date(unixMs),
        ctime: new Date(unixMs),
        birthtime: new Date(unixMs),
        atimeMs: cast(unixMs),
        mtimeMs: cast(unixMs),
        ctimeMs: cast(unixMs),
        birthtimeMs: cast(unixMs),
        ...unsupportedNodeTypes,
        ...extension,
        isDirectory: () => info.isDirectory,
        isFile: () => info.exists && !info.isDirectory,
        mode: cast(0o777),
        rdev: cast(-1),
        size: cast(info.size ?? 0)
      }, ['blksize', 'blocks', 'dev', 'uid', 'gid', 'ino', 'nlink'])
    },
    async unlink(rawPath: string | URL): Promise<void> {
      console.debug(`rm ${pathToString(rawPath)}`)
      await efs.deleteAsync(pathToString(rawPath))
    },
    async writeFile(
      rawPath: string | URL,
      data: string | Uint8Array,
      options?: string | { encoding?: string }
    ): Promise<void> {
      try {
        const path = pathToString(rawPath);
        const encoding = (typeof options == 'string' ? options : options?.encoding) ?? 'utf8';
        console.debug(`write ${path}`);
        const info = await efs.getInfoAsync(path);
        // In SAF files must be created before written. Outside SAF file creation isn't defined.
        if (!info.exists && path.startsWith('content://')) {
          const [parent, name] = popSegment(path);
          const isBinary = data instanceof Uint8Array || encoding == 'base64'
          const mime = isBinary ? 'application/octet-stream' : 'text/plain';
          await efs.StorageAccessFramework.createFileAsync(parent, name, mime);
        }
        if (data instanceof Uint8Array) {
          await efs.writeAsStringAsync(path, bytesToBase64(data))
        } else if (typeof data == 'string') {
          await efs.writeAsStringAsync(path, data, { encoding: encoding as any})
        } else throw new Error('Unsupported data');
      } catch(e: any) {
        console.error(`Write failed with ${e.message}`)
      }
    },
    chmod(rawPath: string|URL, ..._argv: any[]): Promise<any> {
      console.debug(`chmod ${pathToString(rawPath)}`);
      throw new Error(`Filemodes are unsupported`)
    },
    readlink(rawPath: string|URL, ..._argv: any[]): Promise<string> {
      console.debug(`readlink ${pathToString(rawPath)}`);
      throw new Error('Symlinks are unsupported')
    },
    symlink(rawPath: string|URL, ..._argv: any[]): Promise<void> {
      console.debug(`ln -s ${pathToString(rawPath)}`);
      throw new Error('Symlinks are unsupported')
    }
  }
} as ig.PromiseFsClient;