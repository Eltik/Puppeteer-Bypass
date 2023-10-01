export declare class API {
    private requests;
    private cookies;
    private options;
    private browser;
    /**
     * @constructor
     * @description You will NEED to use non-headless mode. It doesn't work otherwise.
     * @param headless Whether to use healdess mode or not. This is required to be false, but for testing you can set it to true.
     * @param skip_chromium_download Whether to skip downloading Chromium. If you're using a VPS, you can set this to true and set the path to the Chromium binary.
     * @param chromium_path Path to the Chromium binary. Only used if skip_chromium_download is true.
     * @param wait_for_network_idle Whether to wait for the network to be idle before returning the response. This is useful for sites that use AJAX to load content.
     */
    constructor(options?: Options);
    /**
     * @description Initialize the browser
     */
    init(): Promise<void>;
    /**
     * @description Safely closes the browser instance. Not necessary to call this function; just have it for good measure.
     */
    close(): Promise<void>;
    /**
     * @description First checks if there are any valid cookies for the URL requested. If not, it will request the URL and get the cookies using Puppeteer. If there are valid cookies, it will use those cookies to make the request.
     * @param url Request URL
     * @param options RequestInit config. Be careful of of using a custom User-Agent/Cookie header, as it will be overwritten.
     * @returns Promise<string>
     */
    request(url: string, options?: RequestInit): Promise<{
        content: string;
        statusCode: number;
        headers: Headers;
    }>;
    /**
     * @description Checks if there is a request object for the URL
     * @param url URL to check for
     * @returns Requests object if found, otherwise undefined
     */
    private getRequest;
    /**
     * @description Removes a request object from the requests array
     * @param url URL to remove from the requests array
     */
    private removeRequest;
    /**
     * @description Checks if the request is a Cloudflare JS challenge
     * @param content HTML content
     * @returns Boolean
     */
    private isCloudflareJSChallenge;
    /**
     * @description Gets the headers for the URL requested to bypass CloudFlare
     * @param url URL to fetch
     * @returns Promise<{ 'User-Agent': string, 'Cookie': string }>
     */
    private getHeaders;
    /**
     * @description Converts a Puppeteer cookie to a tough-cookie cookie
     * @param cookie Cookie object
     * @returns Cookie
     */
    private toToughCookie;
}
export interface Options {
    headless?: boolean;
    skip_chromium_download?: boolean;
    chromium_path?: string;
    wait_for_network_idle?: boolean;
}
