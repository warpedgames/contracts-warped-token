    __      __  _____ _______________________________________
    /  \    /  \/  _  \\______   \______   \_   _____/\______ \
    \   \/\/   /  /_\  \|       _/|     ___/|    __)_  |    |  \
    \        /    |    \    |   \|    |    |        \ |    `   \
    \__/\  /\____|__  /____|_  /|____|   /_______  //_______  /
        \/         \/       \/                  \/         \/

# External documentation

## Flow

`https://miro.com/app/board/uXjVMNMAo-s=/`

## Summary

`https://warped.gitbook.io/warped-universe-documentation/`

<br />

# Install

Copy .env.example as .env and set private key and etherscan api key with your own and install node packages.

`nvm use`

then

`yarn`

<br />

# Test

`yarn test`

`yarn coverage`

`yarn compile`

<br />

# Generate docs

`chmod +x scripts/prepare-docs.sh`

`yarn docs`

<br />

# Deploy

`yarn deploy:testnet`

or

`yarn deploy:mainnet`

<br />

# Verify

Update tokenManager.js, token.js, and taxHandler.js files in scripts/verify/args folder according to the log of the above deploy script. Also, update package.json script params.

`yarn verify:WarpedTaxHandler`

`yarn verify:WarpedToken`

`yarn verify:WarpedTaxHandler`

`yarn verify:WarpedTreasuryHandler`
