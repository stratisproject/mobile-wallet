import { BwcProvider } from '../../providers/bwc/bwc';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ConfigProvider } from '../../providers/config/config';
import { ProfileProvider } from '../../providers/profile/profile';
import { ReplaceParametersProvider } from '../../providers/replace-parameters/replace-parameters';
import { KeyProvider } from '../../providers/key/key';

@Component({
  selector: 'page-sc-tx',
  templateUrl: 'sc-tx.html'
})
export class ScTxPage {
  public wallet;
  public walletName: string;
  public privKey: string;

  public walletNameForm: FormGroup;
  public description: string;

  private config;
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
    private replaceParametersProvider: ReplaceParametersProvider,
    private translate: TranslateService,
    private bwcProvider: BwcProvider,
    private keyProvider: KeyProvider
  ) {
    this.walletName = this.navParams.data.walletName;

    this.walletNameForm = this.formBuilder.group({
      walletName: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SignMessagePage');
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.config = this.configProvider.get();
    let alias =
      this.config.aliasFor &&
      this.config.aliasFor[this.wallet.credentials.walletId];
    this.walletNameForm.value.walletName = alias
      ? alias
      : this.wallet.credentials.walletName;
    this.walletName = this.wallet.credentials.walletName;
    this.description = this.replaceParametersProvider.replace(
      this.translate.instant(
        'When this wallet was created, it was called "{{walletName}}". You can change the name displayed on this device below.'
      ),
      { walletName: this.walletName }
    );

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

  signMessage() {
    // TODO get bitcore conditionally based on wallet.coin???
    let bitcore = this.wallet.coin == 'crs' ? this.bwcProvider.getBitcoreCirrus() : this.bwcProvider.getBitcoreStrax();
    let message = this.walletNameForm.value.walletName;
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
    ] = this.walletNameForm.value.walletName;
    this.configProvider.set(opts);
    this.events.publish('Local/ConfigUpdate', {
      walletId: this.wallet.credentials.walletId
    });
    this.profileProvider.setOrderedWalletsByGroup();
    this.navCtrl.pop();
  }
}
