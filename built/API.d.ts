import { Cookie } from 'tough-cookie';
import { AxiosRequestConfig } from "axios";
export default class API {
    private cookies;
    private options;
    private browser;
    constructor(options?: Options);
    get(url: string, options?: AxiosRequestConfig): Promise<import("axios").AxiosResponse<any, any>>;
    isCloudflareJSChallenge(content: string): Boolean;
    getHeaders(url: string): Promise<{
        'User-Agent': string;
        Cookie: any;
    }>;
    toToughCookie(cookie: Cookie): Cookie;
}
interface Options {
    headless?: boolean;
    skip_chromium_download?: boolean;
}
export {};
