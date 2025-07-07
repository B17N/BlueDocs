# IPFS Setup Guide

## Environment Variables

To use the IPFS functionality, you need to set up the following environment variables:

1. Create a `.env.local` file in the root directory of the project
2. Add the following variables:

```
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_here
```

## Getting API Credentials

1. Sign up for an account at [Pinata.cloud](https://pinata.cloud/)
2. Go to the API Keys section in your dashboard
3. Create a new API key with the necessary permissions (pinFileToIPFS)
4. Copy the JWT token
5. Replace the placeholder value in `.env.local` with your actual JWT

## Testing the Integration

1. Navigate to http://localhost:3000/test
2. Enter some text in the textarea
3. Click "Add to IPFS" button
4. The IPFS hash will be displayed along with links to view the content

## Available Gateways

- Pinata Gateway: `https://gateway.pinata.cloud/ipfs/{hash}`
- Public IPFS Gateway: `https://ipfs.io/ipfs/{hash}`

## Important Notes

- The environment variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- Never commit your actual API credentials to version control
- The uploaded content will be publicly accessible via IPFS gateways
- Pinata provides faster and more reliable access compared to public gateways 