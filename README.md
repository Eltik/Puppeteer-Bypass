<h3>
        <h3>CapSolver.com</h3>
        <br>
        <a href="https://www.capsolver.com/?utm_source=github&utm_medium=ads&utm_campaign=scraping&utm_term=Puppeteer-Bypass">
            <img width="960" alt="CapSolver Ads" src="https://github.com/user-attachments/assets/5ad9174c-b5cb-4e8c-8311-20de87a7d901">
        </a>
</h3>
<br />
Capsolver‘s automatic captcha solver offers the most affordable and quick captcha-solving solution. You may rapidly combine it with your program using its simple integration option to achieve the best results in a matter of seconds.
With a success rate of 99.15%, Capsolver can answer more than 10M captchas every minute. This implies that your automation or scrape will have a 99.99% uptime. You may buy a captcha package if you have a large budget.

At the lowest price on the market, you may receive a variety of solutions, including reCAPTCHA V2, reCAPTCHA V3, hCaptcha, hCaptcha Click, reCaptcha click, Funcaptcha Click, FunCaptcha, aws captcha, picture-to-text, cloudflare, imperva/incapsula, akamai web/bmp, and more. With this service, 0.1s is the slowest speed ever measured.

**Features that are unique on capsolver and are working perfectly :white_check_mark:**:
- Datadome Captcha Token. Read this [blog](https://www.capsolver.com/blog/how-to-solve-datadome)
- AWS Captcha Token. Read this [blog](https://www.capsolver.com/blog/how-to-solve-aws-amazon-captcha-token)
- hCaptcha Enterprise Token. Read this [blog](https://www.capsolver.com/blog/how-to-solve-hcaptcha-enterprise)
- reCaptcha v3 / v3 enterprise with 0.9 scores Token. Read this [blog](https://www.capsolver.com/blog/how-to-solve-reCAPTCHA-v3)
- reCaptcha v2 Enterprise Token. Read this [blog](https://www.capsolver.com/blog/How-to-bypass-all-the-versions-reCAPTCHA-v2-v3)

# Puppeteer-Bypass
Bypassing CloudFlare's anti-bot challenge with a new optimized method.

## Background
Bypassing CloudFlare isn't anything new, and neither is bypassing it with headless browsers. However, after seeing some outdated repositories such as [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) and [Pupflare](https://github.com/unixfox/pupflare), I wondered if it would be possible to update those repositories but in an optimized and less resource-intensive way. Long story short, I found [this](https://github.com/JimmyLaurent/cloudflare-scraper) and tried it out. It didn't work very well unfortunately and errored out on quite a few sites, but after tweaking it (issue with cookies by the way, if anyone wants to try using JimmyLaurent's repository specifically) I got it working on every single site. But since headless browsers are just not viable for production, I decided to try and "cache" each response and store the bypass headers in the object for use later. Anyways, that's kind of how this repository works: fetching cookies, storing them, and then re-using them until it breaks before finally repeating the process over again.

## Installation
Puppeteer-Bypass requires Node version 18 (untested, v19+ doesn't work however) and `chromium-browser` on Linux.
1. Clone this repository.
```bash
git clone https://github.com/Eltik/Puppeteer-Bypass.git
```
2. Run `npm i`.
3. If necessary, download [Google Chrome](https://www.google.com/chrome/) (this version uses Chromium which comes with Google Chrome, but you can create a pull request/fork to use Firefox/Edge).
4. To test out the project, run `npm run test` to send a request to [JustLightNovels](https://www.justlightnovels.com/) which as of now (2/17/2023) has CloudFlare's "Under Attack Mode" on.<br />

For installing this on Linux, make sure you have Chromium and VNC/xorg installed. The reason for this is that this bypass will NOT work with a proper window/GUI application installed. The below will show you how to install VNC server for Linux specifically as that's what I used to get this working on my VPS. You can follow [this tutorial](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/use-remote-desktop?tabs=azure-cli) to help install a GUI for Linux if you're using Windows. The following will show you some basic stuff that I recommend personally for installing a custom GUI.
```bash
# Install Chromium Browser
sudo apt-get install chromium-browser

# Install a literal desktop lol
sudo apt install xfce4 xfce4-goodies

# Install XRDP
sudo apt-get -y install xvfb
```
If you are following the Azure tutorial, please note that since Windows supports the "Remote Desktop Connection" app and MacOS doesn't have one natively. A solution would to install "Microsoft Remote Desktop" in the App Store and connect to your VPS's IP.<br />
### Common Errors
As someone who HATES using Linux, here are some common errors I get:
1. <b>"Cannot find Chromium"</b>
    - Run `sudo apt-get install chromium-browser`.
    - Find the `.cache/puppeteer` directory and copy the path.
    - Create a `.puppeteerrc.cjs` file in your project directory.
    - Follow the instructions [here](https://pptr.dev/guides/configuration) under the "Changing the default cache directory".
2. <b>"Missing dependencies"</b>
    - Just...
    ```bash
    sudo apt-get update
    sudo apt-get install ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
    ```
3. <b>"Missing Display X"</b>
    - Install `xvfb`
    - Connect to your VPS's IP via the "Remote Desktop Connection" application on Windows or install "Microsoft Remote Desktop" on MacOS.
[This](https://stackoverflow.com/questions/59379842/error-when-installing-and-running-xrdp-remote-desktop-with-gnome-ubuntu-i-enc#:~:text=4%20Answers%201%201.%20Remove%20previously%20installed%20xrdp%3A,system%3A%20...%204%204.%20Firewall%20configuration%20%28optional%29%3A%20) is also very helpful.
## Using as a "Library"
I'm sure people want to use this project as a library, but just be aware that headless browsers use up a <b>LOT</b> of memory and CPU power. Luckily, this project is meant to avoid the use of headless browsers as much as possible, but it is something to keep in mind. It is recommended that you use a higher-end VPS or hoster with at least 4GB of memory if not more.

### Initalizing the Constructor
```javascript
// ES6
import API from "./built/API"

// If you hate the fact that I named the main class API, you can change it lol
import * as PuppeteerBypaass from "./built/API"

// CommonJS
const API = require("./built/API").default;

const bypass = new API();

// These are the default values for the constructor. Change it as you see fit.
// It is recommended you keep all the default values, but they're there if you need to change them.
// { headless } is the option of whether you want to launch Puppeteer in headless mode or not.
// { skip_chromium_download } is the option of whether you want to skip downloading Chromium or not.
const bypass2 = new API({ headless: true, skip_chromium_download: false });
```

### Sending Requests
```javascript
import API from "./buil/API"
const bypass = new API();
// The second parameter is just the default fetch config.
await bypass.request("https://myprotectedsite.com", { method: "PUT",
    headers: {
        Referer: "https://myprotectedsite.com",
        "User-Agent": "randomuseragent", // PLEASE NOTE THAT THIS WILL GET OVERWRITTEN
        Cookie: "value1=lol;value2=something", // THIS ALSO WILL GET OVERWRITTEN
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "applicatipn/json",
        Accept: "application/json"
    }
})
```
