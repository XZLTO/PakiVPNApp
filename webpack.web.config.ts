import type { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import * as fse from 'fs-extra';

class CopyAfterBuildPlugin {
  constructor(options: { from: string; to: string }) {
    this.from = options.from;
    this.to = options.to;
  }
  from: string;
  to: string;
  apply(compiler: any) {
    compiler.hooks.done.tap('CopyAfterBuildPlugin', () => {
      fse.copySync(this.from, this.to, { recursive: true, overwrite: true });
      // eslint-disable-next-line no-console
      console.log(`[CopyAfterBuildPlugin] Copied from ${this.from} to ${this.to}`);
    });
  }
}

export default {
  entry: './src/index.ts',
  output: {
    path: __dirname + '/.webpack/web',
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
    new CopyAfterBuildPlugin({
      from: path.resolve(__dirname, '.webpack/web'),
      to: path.resolve(__dirname, 'android/app/src/main/res/raw'),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  target: 'web',
  node: false,
} as Configuration;
