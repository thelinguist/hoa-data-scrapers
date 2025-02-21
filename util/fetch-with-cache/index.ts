import * as fs from "fs"
import config from "../config"

const ENCODING = "utf-8"
const existsInCache = async (cachePath: fs.PathLike) => {
    try {
        const stat = await fs.promises.stat(cachePath)
        const expiration = new Date().getTime() - config.cache.TTL
        return stat && stat.ctimeMs > expiration
    } catch (e) {
        return false
    }
}

/**
 *
 * @param url
 * @param slug string: cache key
 * @param options
 */
export const fetchHTMLWithCache = async (url: string, slug: string, options?: {}): Promise<string> => {
    const cachePath = `${config.cache.dir}/${slug}.html`
    if (!(await existsInCache(cachePath))) {
        console.log("does not exist in cache")
        const res = await fetch(url, options)
        if (!res.ok) {
            throw new Error(`failed to read ${url} with status ` + res.status + ": " + res.statusText)
        } else {
            const rawHtml = await res.text()
            await fs.promises.mkdir(config.cache.dir, { recursive: true })
            await fs.promises.writeFile(cachePath, rawHtml, {
                encoding: ENCODING,
            })
            return rawHtml
        }
    }
    const fileBuffer = await fs.promises.readFile(cachePath)
    return fileBuffer.toString(ENCODING)
}

export const cleanCache = async () => {
    const files = await fs.promises.readdir(config.cache.dir)
    const expiration = new Date().getTime() - (config.cache.TTL * 2)
    const filesToDelete = files.filter(file => {
        const fileCTime = fs.statSync(`${config.cache.dir}/${file}`).ctimeMs
        return fileCTime < expiration
    })
    await Promise.all(filesToDelete.map(file => fs.promises.unlink(`${config.cache.dir}/${file}`)))
}
