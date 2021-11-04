import { BwcProvider } from '../../providers/bwc/bwc';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { KeyProvider } from '../../providers/key/key';
import { ScanPage } from '../scan/scan';
import { ErrorsProvider, PlatformProvider } from '../../providers';
import { ConfirmScPage } from '../send/confirm-sc/confirm-sc';
import { QrCodePayload } from 'calldataserializer';

@Component({
  selector: 'page-sc-tx',
  templateUrl: 'sc-tx.html'
})
export class ScTxPage {
  public wallet;
  public txData = JSON.stringify({
    to: "tSE2mpV4vBi7tiLUUAhyLNN8FooD3bYrag",
    methodName: "Approve",
    amount: "0",
    parameters: [
      {
        label: "Address",
        value: "9#tWBY7T75kB8jfwACbWX7jLjapSe7gPou6z"
      },
      {
        label: "Current Amount",
        value: "7#0"
      },
      {
        label: "Amount",
        value: "7#1"
      }
    ],
    callbackUrl: "http://test.example.com"
  } as QrCodePayload);
  
  // string = '{ "sender": "tJyppxPeKs9rbsidSi3pqCYitkdGYjo57r", "to": "tJyppxPeKs9rbsidSi3pqCYitkdGYjo57r", "amount": "0", "methodName": "SwapExactSrcForCrs", "parameters": [{ "label": "Token In Amount", "value": "12#1000000" }] }';
  
  public privKey: string;

  public scTxDataForm: FormGroup;
  public description: string;

  public config;
  signedMessage: any;
  xPrivKey: any;

  constructor(
    private profileProvider: ProfileProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private configProvider: ConfigProvider,
    private formBuilder: FormBuilder,
    private events: Events,
    private logger: Logger,
    // private replaceParametersProvider: ReplaceParametersProvider,
    // private translate: TranslateService,
    private bwcProvider: BwcProvider,
    private keyProvider: KeyProvider,
    private platformProvider: PlatformProvider,
    private errorsProvider: ErrorsProvider
  ) {
    this.events.subscribe('Local/ScTx', this.updateScTxDataHandler);

    this.scTxDataForm = this.formBuilder.group({
      txData: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  private updateScTxDataHandler: any = data => {
    this.txData = data.value;
    this.validateInput();
  };

  private validateInput() {
    try {
      JSON.parse(this.txData);
    }
    catch (e) {
      this.errorsProvider.showDefaultError(
        e,
        "Unreadable scan",
        () => {
          this.logger.error("Scanned SC json was invalid")
              this.navCtrl.pop();
        }
      );
    }
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromScTx: true }, { animate: false });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: ScTxPage');
    if(this.platformProvider.isCordova) {
      this.openScanner();
    }
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.config = this.configProvider.get();
    // let alias =
    //   this.config.aliasFor &&
    //   this.config.aliasFor[this.wallet.credentials.walletId];

    this.keyProvider
      .handleEncryptedWallet(this.wallet.keyId)
      .then((password: string) => {
        const keys = this.keyProvider.get(this.wallet.keyId, password);
        this.xPrivKey = keys.xPrivKey; // xPrivKey is HD priv key        
      })
      .catch(err => {
        // TODO handle this properly
        console.log(err);
        this.navCtrl.pop();
      });
  }

  jsonTxData() {
    return JSON.stringify(this.txData);
  }

  broadcastSignedMessage() {
    this.validateInput();
    
    // TODO finish this
    this.navCtrl.push(ConfirmScPage, {
      toAddress: 'tJyppxPeKs9rbsidSi3pqCYitkdGYjo57r',
      amount: 0,
      walletId: this.wallet.credentials.walletId,
      scData: JSON.parse(this.txData),
      // totalInputsAmount:
      //   this.totalAmount *
      //   this.currencyProvider.getPrecision(this.wallet.coin).unitToSatoshi,
      // toAddress: this.recipient.toAddress,
      coin: this.wallet.coin,
      network: this.wallet.network,
      useSendMax: false,
      // inputs: _.filter(this.inputs, 'checked')
    });
  }

  signMessage() {
    // TODO get bitcore conditionally based on wallet.coin???
    let bitcore = this.wallet.coin == 'crs' ? this.bwcProvider.getBitcoreCirrus() : this.bwcProvider.getBitcoreStrax();
    let message = this.scTxDataForm.value.walletName;
    let bcMessage = new bitcore.Message(message);

    // const changeNum = 0; // Not change
    // const addressIndex = 0; // Always the first address on Cirrus
    // const path = `m/${changeNum}/${addressIndex}`;
    const privKey = new bitcore.HDPrivateKey(this.xPrivKey).deriveChild(0).privateKey;

    // Two ways to do this but this one requires modifying message...
    // let signedMessage1 = bcMessage.sign(privKey);

    let ecdsa = bitcore.crypto.ECDSA().set({
      hashbuf: bcMessage.magicHash(),
      privkey: privKey
    });    
    ecdsa.sign()
    ecdsa.calci();
    
    let sig = ecdsa.sig;
    let sigBytes = sig.toCompact();
    this.signedMessage = sigBytes.toString('base64');
  };

  public save(): void {
    let opts = {
      aliasFor: {}
    };
    opts.aliasFor[
      this.wallet.credentials.walletId
    ] = this.scTxDataForm.value.walletName;
    this.configProvider.set(opts);
    this.events.publish('Local/ConfigUpdate', {
      walletId: this.wallet.credentials.walletId
    });
    this.profileProvider.setOrderedWalletsByGroup();
    this.navCtrl.pop();
  }
}
