import { Browser, executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CookieJar, Cookie } from 'tough-cookie';

import { setTimeout as delay } from 'node:timers/promises';

export default class API {
    private requests: RequestMeta[] = [];

    private cookies: CookieJar = new CookieJar();
    private options: Options;
    private browser: Browser = null;

    /**
     * @constructor
     * @description You will NEED to use non-headless mode. It doesn't work otherwise.
     * @param headless Whether to use healdess mode or not. This is required to be false, but for testing you can set it to true.
     * @param skip_chromium_download Whether to skip downloading Chromium. If you're using a VPS, you can set this to true and set the path to the Chromium binary.
     * @param chromium_path Path to the Chromium binary. Only used if skip_chromium_download is true.
     * @param wait_for_network_idle Whether to wait for the network to be idle before returning the response. This is useful for sites that use AJAX to load content.
     */
    constructor(options: Options = { headless: false, skip_chromium_download: false, chromium_path: '/usr/bin/chromium-browser', wait_for_network_idle: false }) {
        this.options = options;
    }

    /**
     * @description Initialize the browser
     */
    public async init() {
        puppeteer.use(StealthPlugin());
        
        // These can be optimized more. I just put them here for now.
        const options = {
            headless: this.options.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            ignoreDefaultArgs: ['--disable-extensions'],
            executablePath: executablePath(),
            env: {
                DISPLAY: ':10.0',
            }
        }
        if (this.options.skip_chromium_download) {
            options['executablePath'] = this.options.chromium_path;
        }

        // Launches the browser
        this.browser = await puppeteer.launch(options as any);
    }

    /**
     * @description Safely closes the browser instance. Not necessary to call this function; just have it for good measure.
     */
    public async close() {
        await this.browser.close();
        // Resets the browser variable so that if the object is used again, the browser will be re-initialized
        this.browser = null;
    }

    /**
     * @description First checks if there are any valid cookies for the URL requested. If not, it will request the URL and get the cookies using Puppeteer. If there are valid cookies, it will use those cookies to make the request.
     * @param url Request URL
     * @param options RequestInit config. Be careful of of using a custom User-Agent/Cookie header, as it will be overwritten.
     * @returns Promise<string>
     */
    public async request(url: string, options: RequestInit = { headers: {} }): Promise<{ content: string, statusCode: number; headers: Headers }> {
        // First check if the request is stored in the object
        const possible = this.getRequest(url);

        if (!possible) {
            const response = await fetch(url, options);
            const content = await response.text();
            
            if (!this.isCloudflareJSChallenge(content)) {
                // No need to fetch headers, just return the response
                return {
                    content,
                    statusCode: response.status,
                    headers: response.headers,
                };
            }

            // Fetch headers needed to bypass CloudFlare.
            const headers = await this.getHeaders(url);
            this.requests.push({
                url: url,
                options: options,
                cookies: headers.Cookie,
                userAgent: headers['User-Agent']
            })
            options.headers['User-Agent'] = headers['User-Agent']
            options.headers['Cookie'] = headers['Cookie']

            // Send a request with the headers
            const responseWithHeaders = await fetch(url, options);

            return {
                content: await responseWithHeaders.text(),
                statusCode: responseWithHeaders.status,
                headers: responseWithHeaders.headers,
            };
        }

        // Set the headers/cookies to the stored request
        options.headers['User-Agent'] = possible.userAgent;
        options.headers['Cookie'] = possible.cookies;
        // Try to send the request
        const response = await fetch(url, options)
        const content = await response.text();

        // Check if the error is due to a CloudFlare challenge
        if (this.isCloudflareJSChallenge(content)) {
            // If it is, remove the request (it's invalid)
            this.removeRequest(url);
            // Try to send the request again with new headers
            return this.request(url, options);
        }
        
        return {
            content,
            statusCode: response.status,
            headers: response.headers,
        };
    }

    /**
     * @description Checks if there is a request object for the URL
     * @param url URL to check for
     * @returns Requests object if found, otherwise undefined
     */
    private getRequest(url: string): RequestMeta | undefined {
        return this.requests.find((request) => request.url === url);
    }

    /**
     * @description Removes a request object from the requests array
     * @param url URL to remove from the requests array
     */
    private removeRequest(url: string) {
        const index = this.requests.findIndex((request) => request.url === url);

        if (index !== -1) {
            this.requests.splice(index, 1);
        }
    }

    /**
     * @description Checks if the request is a Cloudflare JS challenge
     * @param content HTML content
     * @returns Boolean
     */
    private isCloudflareJSChallenge(content: string): Boolean {
        return content.includes('_cf_chl_opt');
    }

    /**
     * @description Gets the headers for the URL requested to bypass CloudFlare
     * @param url URL to fetch
     * @returns Promise<{ 'User-Agent': string, 'Cookie': string }>
     */
    private async getHeaders(url: string): Promise<{ 'User-Agent': string, 'Cookie': string }> {
        // Check if the browser is open or not
        if (!this.browser) {
            // Launch the browser
            await this.init();
        }
        const page = await this.browser.newPage();
        await page.goto(url);

        // Basic timeout
        // There's an env variable for this if you want to change it
        const timeoutInMs = Number(process.env.PUP_TIMEOUT) || 16000;

        // Update the HTML content until the CloudFlare challenge loads
        let count = 1;
        let content = '';
        while (content === '' || this.isCloudflareJSChallenge(content)) {
            // Scuffed code.
            // Basically it will wait for the network to be idle, then get the HTML content and
            // cbeck if it's a CloudFlare challenge. If it is, it will try again.
            if (this.options.wait_for_network_idle) {
                // Sometimes with slow VPS's/computers, the network will never be idle, so this will timeout
                await page.waitForNetworkIdle({ timeout: timeoutInMs });   
            } else {
                // Wait for a second
                await delay(1000);
            }
            if (!page) {
                throw new Error('Page is null!');
            }
            content = await page.content();
            // Sometimes there is a captcha or the browser gets stuck, so an error will be thrown in that case
            if (count++ > 10) {
                throw new Error('stuck');
            }
        }

        // Fetch the browser's cookies (contains cf_clearance and other important cookies to bypass CloudFlare)
        const cookies = await page.cookies();
        for (let cookie of cookies) {
            // Update the cookie jar
            this.cookies.setCookie(this.toToughCookie(cookie), url.toString()).catch((err) => {
                return;
            });
        }

        // You need to fetch the User-Agent since you can't bypass CloudFlare without a valid one
        const userAgent = await page.evaluate(() => navigator.userAgent);
        const cookieList = await this.cookies.getCookies(url);

        // These are the headers required to bypass CloudFlare
        const headers = {
            'User-Agent': userAgent, // Browser User-Agent
            'Cookie': cookieList.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ') // Cookies as a string
        };

        // No need to use that page anymore.
        await page.close();

        return headers;
    }

    /**
     * @description Converts a Puppeteer cookie to a tough-cookie cookie
     * @param cookie Cookie object
     * @returns Cookie
     */
    private toToughCookie(cookie: Cookie): Cookie {
        const { name, value, expires, domain, path } = cookie;
        const isExpiresValid = expires && typeof expires === 'number';

        const expiresDate = isExpiresValid ? new Date(expires * 1000) : new Date(Date.now() + 9999 * 1000);

        return new Cookie({
            key: name,
            value,
            expires: expiresDate,
            domain: domain.startsWith('.') ? domain.substring(1) : domain,
            path
        });
    }
}

export interface Options {
    headless?: boolean;
    skip_chromium_download?: boolean;
    chromium_path?: string;
    wait_for_network_idle?: boolean;
}

interface RequestMeta {
    url: string;
    options: RequestInit;
    cookies: CookieJar;
    userAgent: string;
}