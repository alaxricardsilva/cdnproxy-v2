import { Injectable } from '@nestjs/common';

export interface DeviceInfo {
  device: string;
  os: string;
  browser: string;
  isBot: boolean;
  isApp: boolean;
  isBrowser: boolean;
  isStreamingDevice: boolean;
}

@Injectable()
export class DeviceDetectionService {
  constructor() {
    console.log('DeviceDetectionService inicializado');
  }

  detectDevice(userAgent: string): DeviceInfo {
    if (!userAgent) {
      return {
        device: 'Unknown',
        os: 'Unknown',
        browser: 'Unknown',
        isBot: false,
        isApp: false,
        isBrowser: false,
        isStreamingDevice: false,
      };
    }
    // Simples parse de user agent (exemplo)
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    else if (/tablet/i.test(userAgent)) device = 'Tablet';

    let os = 'Unknown';
    if (/windows/i.test(userAgent)) os = 'Windows';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/linux/i.test(userAgent)) os = 'Linux';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/mac os/i.test(userAgent)) os = 'MacOS';

    let browser = 'Unknown';
    if (/chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/edge/i.test(userAgent)) browser = 'Edge';
    else if (/msie|trident/i.test(userAgent)) browser = 'IE';

    // Flags simples para exemplo
    const isBot = /bot|spider|crawler/i.test(userAgent);
    const isBrowser = /chrome|firefox|safari|edge|msie|trident/i.test(userAgent);
    const isStreamingDevice = /smarttv|roku|firetv|chromecast|appletv|androidtv/i.test(userAgent);
    const isApp = /iptv|player|app/i.test(userAgent);

    return { device, os, browser, isBot, isApp, isBrowser, isStreamingDevice };
  }
}