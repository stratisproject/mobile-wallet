# Stratis Mobile Wallet

Stratis Mobile Wallet is a secure Strax and Cirrus wallet platform for both Android and iOS mobile devices. Stratis Mobile Wallet uses [Stratis Bitcore Wallet Service](https://github.com/stratisproject/bitcore-stratis/tree/master/packages/bitcore-wallet-service) (BWS) for peer synchronization and network interfacing.

This project was forked from the [BitPay Wallet](https://github.com/bitpay/wallet).

## Main Features

- Strax and Cirrus support
- Smart contract transaction building, signing and broadcasting
- [Stratis Signature Auth Specification](https://github.com/Opdex/SSAS) support
- Multiple wallet creation and management in-app
- [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) Hierarchical deterministic (HD) address generation and wallet backups
- Device-based security: all private keys are stored locally, not in the cloud
- Support testnet wallets for all supported coins.
- Mnemonic (BIP39) support for wallet backups
- Customizable wallet naming and background colors
- Multiple languages supported

## Testing in a Browser

> **Note:** This method should only be used for development purposes. When running Stratis Mobile Wallet in a normal browser environment, browser extensions and other malicious code might have access to internal data and private keys.

Clone the repo and open the directory:

```sh
git clone https://github.com/stratisproject/mobile-wallet.git
cd wallet
```

Ensure you have [Node](https://nodejs.org/) v10 installed, then install and start Wallet:

```sh
npm install
npm run apply:stratis
npm run start
```

Visit [`localhost:8100`](http://localhost:8100/) to view the app.

## Unit & E2E Tests (Karma & Protractor)

To run the tests, run:

```
 npm run test
```

## Testing on Real Devices

It's recommended that all final testing be done on a real device – both to assess performance and to enable features that are unavailable to the emulator (e.g. a device camera).

### Android

Follow the [Cordova Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) to set up your development environment.

When your development environment is ready, run the `start:android` package script.

```sh
npm run apply:stratis
npm run prepare:stratis
npm run start:android
```

### iOS

Follow the [Cordova iOS Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/) to set up your development environment.

When your development environment is ready, run the `start:ios` package script.

```sh
npm run apply:stratis
npm run prepare:stratis
npm run start:ios
```

## Build Stratis Mobile Wallet App Bundles

Before building the release version for a platform, run the `clean-all` command to delete any untracked files in your current working directory. (Be sure to stash any uncommitted changes you've made.) This guarantees consistency across builds for the current state of this repository.

The `final` commands build the production version of the app, and bundle it with the release version of the platform being built.

### Android

```sh
npm run clean-all
npm install
npm run apply:stratis
npm run prepare:stratis
npm run final:android
```

### iOS

```sh
npm run clean-all
npm install
npm run apply:stratis
npm run prepare:stratis
npm run final:ios
```

## Stratis Mobile Wallet Backups and Recovery

Stratis Mobile Wallet uses BIP39 mnemonics for backing up wallets. The BIP44 standard is used for wallet address derivation. Multisig wallets use P2SH addresses, while non-multisig wallets use P2PKH.

Information about backup and recovery procedures is available at: https://github.com/stratisproject/mobile-wallet/blob/master/backupRecovery.md

It is possible to recover funds from a Stratis Mobile Wallet without using the Stratis Mobile Wallet or the Wallet Service. The BIP39 mnemonic can also be imported into the [Strax desktop wallet](https://github.com/stratisproject/StraxUI/) and [Cirrus desktop wallet](https://github.com/stratisproject/CirrusCore).

## Wallet Export Format

Stratis Mobile Wallet encrypts the backup with the [Stanford JS Crypto Library](http://bitwiseshiftleft.github.io/sjcl/). To extract the private key of your wallet you can go to settings, choose your wallet, click in "more options", then "wallet information", scroll to the bottom and click in "Extended Private Key". That information is enough to sign any transaction from your wallet, so be careful when handling it!

The backup also contains the key `publicKeyRing` that holds the extended public keys of the Copayers.
Depending on the key `derivationStrategy`, addresses are derived using
[BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) or [BIP45](https://github.com/bitcoin/bips/blob/master/bip-0045.mediawiki). Wallets created in Copay v1.2 and forward always use BIP44, all previous wallets use BIP45. Also note that since Copay version v1.2, non-multisig wallets use address types Pay-to-PublicKeyHash (P2PKH) while multisig wallets still use Pay-to-ScriptHash (P2SH) (key `addressType` at the backup):

| Copay Version | Wallet Type               | Derivation Strategy | Address Type |
| ------------- | ------------------------- | ------------------- | ------------ |
| <1.2          | All                       | BIP45               | P2SH         |
| ≥1.2          | Non-multisig              | BIP44               | P2PKH        |
| ≥1.2          | Multisig                  | BIP44               | P2SH         |
| ≥1.5          | Multisig Hardware wallets | BIP44 (root m/48’)  | P2SH         |

Using a tool like [Bitcore PlayGround](http://bitcore.io/playground) all wallet addresses can be generated. (TIP: Use the `Address` section for P2PKH address type wallets and `Multisig Address` for P2SH address type wallets). For multisig addresses, the required number of signatures (key `m` on the export) is also needed to recreate the addresses.

BIP45 note: All addresses generated at BWS with BIP45 use the 'shared cosigner index' (2147483647) so Copay address indexes look like: `m/45'/2147483647/0/x` for main addresses and `m/45'/2147483647/1/y` for change addresses.

## Stratis Bitcore Wallet Service

Stratis Mobile Wallet depends on [Stratis Bitcore Wallet Service](https://github.com/stratisproject/bitcore-stratis/tree/master/packages/bitcore-wallet-service) (BWS) for blockchain information and networking. Please note that Stratis Mobile Wallet uses CSP to restrict network access. Custom BWS instances are not supported.

## Translations

Stratis Mobile Wallet uses standard gettext PO files for translations.

**Translation Credits:**

- Japanese: @dabura667
- French: @kirvx
- Portuguese: @pmichelazzo
- Spanish: @cmgustavo
- German: @saschad
- Russian: @vadim0

_Gracias totales!_

## Release Schedules

Stratis Mobile Wallet uses the `MAJOR.MINOR.BATCH` convention for versioning. Any release that adds features should modify the MINOR or MAJOR number.

## License

Stratis Mobile Wallet is released under the MIT License. Please refer to the [LICENSE](https://github.com/stratisproject/mobile-wallet/blob/master/LICENSE) file that accompanies this project for more information including complete terms and conditions.
