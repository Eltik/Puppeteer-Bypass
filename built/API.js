"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const puppeteer_1 = require("puppeteer");
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const tough_cookie_1 = require("tough-cookie");
class API {
    /**
     * @constructor
     * @description You will NEED to use non-headless mode. It doesn't work otherwise.
     * @param headless Whether to use healdess mode or not. This is required to be false, but for testing you can set it to true.
     * @param skip_chromium_download Whether to skip downloading Chromium. If you're using a VPS, you can set this to true and set the path to the Chromium binary.
     * @param chromium_path Path to the Chromium binary. Only used if skip_chromium_download is true.
     * @param wait_for_network_idle Whether to wait for the network to be idle before returning the response. This is useful for sites that use AJAX to load content.
     */
    constructor(options = { headless: false, skip_chromium_download: false, chromium_path: '/usr/bin/chromium-browser', wait_for_network_idle: false }) {
        this.requests = [];
        this.cookies = new tough_cookie_1.CookieJar();
        this.browser = null;
        this.options = options;
    }
    /**
     * @description Initialize the browser
     */
    async init() {
        puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
        // These can be optimized more. I just put them here for now.
        const options = {
            headless: this.options.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreHTTPSErrors: true,
            defaultViewport: null,
            ignoreDefaultArgs: ['--disable-extensions'],
            executablePath: (0, puppeteer_1.executablePath)(),
            env: {
                DISPLAY: ':10.0',
            }
        };
        if (this.options.skip_chromium_download) {
            options['executablePath'] = this.options.chromium_path;
        }
        // Launches the browser
        this.browser = await puppeteer_extra_1.default.launch(options);
    }
    /**
     * @description Safely closes the browser instance. Not necessary to call this function; just have it for good measure.
     */
    async close() {
        if (!this.browser) {
            return;
        }
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
    async request(url, options = { headers: {} }) {
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
            });
            options.headers['User-Agent'] = headers['User-Agent'];
            options.headers['Cookie'] = headers['Cookie'];
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
        const response = await fetch(url, options);
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
    getRequest(url) {
        return this.requests.find((request) => request.url === url);
    }
    /**
     * @description Removes a request object from the requests array
     * @param url URL to remove from the requests array
     */
    removeRequest(url) {
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
    isCloudflareJSChallenge(content) {
        return content.includes('_cf_chl_opt');
    }
    /**
     * @description Gets the headers for the URL requested to bypass CloudFlare
     * @param url URL to fetch
     * @returns Promise<{ 'User-Agent': string, 'Cookie': string }>
     */
    async getHeaders(url) {
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
        let count = 0;
        let content = '';
        while (true) {
            count += 1;
            if (count === 10) {
                throw new Error('Cloudflare challenge not resolved after multiple attempts');
            }
            // Wait for the page to load completely or for Cloudflare challenge to resolve
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: timeoutInMs }),
                page.waitForFunction(() => !document.body.innerHTML.includes('_cf_chl_opt'), { timeout: timeoutInMs }),
            ]);
            content = await page.content();
            if (!this.isCloudflareJSChallenge(content)) {
                break;
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
            'User-Agent': userAgent,
            'Cookie': cookieList.map((cookie) => `${cookie.key}=${cookie.value}`).join('; ') // Cookies as a string
        };
        // No need to use that page anymore.
        if (!page) {
            await page.close();
        }
        return headers;
    }
    /**
     * @description Converts a Puppeteer cookie to a tough-cookie cookie
     * @param cookie Cookie object
     * @returns Cookie
     */
    toToughCookie(cookie) {
        const { name, value, expires, domain, path } = cookie;
        const isExpiresValid = expires && typeof expires === 'number';
        const expiresDate = isExpiresValid ? new Date(expires * 1000) : new Date(Date.now() + 9999 * 1000);
        return new tough_cookie_1.Cookie({
            key: name,
            value,
            expires: expiresDate,
            domain: domain.startsWith('.') ? domain.substring(1) : domain,
            path
        });
    }
}
exports.API = API;
//# sourceMappingURL=API.js.map