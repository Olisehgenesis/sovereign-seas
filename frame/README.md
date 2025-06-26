# A Farcaster Celo Tip Me Frame v2 Template.

## Getting Started

This is a [NextJS](https://nextjs.org/) + TypeScript + React app Template

To install dependencies:

```bash
$ yarn
```

To run the app:

```bash
$ yarn dev
```

## Running on localhost with Ngrok

To expose your **localhost** server to the internet using **ngrok**, install and run:

```bash
ngrok http 3000
```
This will generate a public URL ending in:

```
.ngrok-free.app
```

You can use this URL to open the app on your mobile device or a browser to test its functionality.

## Running on localhost with Frame.js Debugger

You can debug and see how the frame will work on using the Frame.js debugger.

Just type:

```
$ frames
```

And a debugger link like this will appear in the console:
```
http://localhost:3010
```

Use this local debugger to test your frame interactions before deploying.

## Deploy on Vercel

To deploy your frame you just need to 

````
vercel
````

after you maked just that working as spected you can deploy on prod

```
vercel --prod
```

## Testing the Frame

To test the frame, open the Warpcast app, go to Developer Tools, and test both the embedded image and the full frame.



