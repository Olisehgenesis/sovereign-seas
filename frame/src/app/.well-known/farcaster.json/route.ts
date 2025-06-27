export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;
  
  // The .well-known/farcaster.json route is used to provide the configuration for the Frame.
  // You need to generate the accountAssociation payload and signature using this link:

  const config = {
    
      "accountAssociation": {
        "header": "eyJmaWQiOjgxMDc4MiwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDAzQzI1RTVGYTNiMjIwRjdhRDExODA5MTQ5YjA2OTg1NkRFMDhlNGEifQ",
        "payload": "eyJkb21haW4iOiJzb3ZzZWFzdjIudmVyY2VsLmFwcCJ9",
        "signature": "bx+Atw/crYqJvCYPhDn548EilFx/SdjczsaXP/SdPPcCJSAVlSv5+RyvdPtaQFmKwBT+TbdskukDr0CURK48Whs="
      },
    
    frame: {
      version: "1",
      name: "Sov Seas",
      iconUrl: `${appUrl}/logo.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/logo.png`,
      buttonTitle: "Launch Frame",
      splashImageUrl: `${appUrl}/logo.png`,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}