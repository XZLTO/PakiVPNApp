import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';


const extraResources: { file: string, moveTo: string }[] = [
  {
    file: "./web/**/*",
    moveTo: "/"
  },
  {
    file: "./sing-box/*",
    moveTo: "/"
  }
];

const config: ForgeConfig = {

  packagerConfig: {
    name: "PakiVPN",
    asar: false,
    
    icon: "./images/logo",
    "protocols": [
      {
        "name": "PakiVpn",
        "schemes": ["paki"]
      }
    ],
    extraResource: [],
    beforeCopy: [(resourcesPath: string, version: string, platform: string, arch: string, callback: (err?: Error) => void) => {
      try {
        extraResources.forEach(element => {
          const files = glob.sync(element.file, { nodir: true, absolute: false });
          console.log(files);

          files.forEach(file => {
            const relativePath = path.relative(__dirname, file);
            const destinationPath = path.join(resourcesPath, element.moveTo, relativePath);
            const destinationDir = path.dirname(destinationPath);

            console.log(`Copying ${file} to ${destinationPath}`);

            if (!fs.existsSync(destinationDir)) {
              fs.mkdirSync(destinationDir, { recursive: true });
            }

            fs.copyFileSync(file, destinationPath);
          });
        });
        callback()
      } catch (err) {
        callback(err as Error);
      }
    }]
  },
  makers: [
    new MakerSquirrel({
      setupIcon: "./images/logo.ico",
    },['win32']),
    new MakerZIP({}, ['darwin', 'win32', 'linux']), // ZIP для всех платформ
    new MakerRpm({},['darwin']),
    new MakerDeb({},['linux'])
  ],
  plugins: [
    //new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            name: 'main_window',
            preload: {
              js: './src/app/preload.ts',
            },
          },
        ],
      },
      port: 3001,
      loggerPort: 9001
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'XZLTO',
          name: 'PakiVPNDesktop'
        },
        prerelease: false,
        platform: ['win32', 'darwin', 'linux'],
      }
    }
  ]
};

export default config;
