import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Events, NavController, NavParams } from 'ionic-angular';
import { Logger } from '../../providers/logger/logger';

// providers
import { ProfileProvider } from '../../providers/profile/profile';
import { ErrorsProvider, PlatformProvider } from '../../providers';
import { ScanPage } from '../scan/scan';
import { ConfirmAuthPage } from '../send/confirm-auth/confirm-auth';
import _ from 'lodash';
import { AuthData } from '../../models/auth/authdata';

/*
Opens the scanner, reads a QR and passes the raw data to the confirmation page.

*/
@Component({
  selector: 'page-auth-scan',
  templateUrl: 'auth-scan.html'
})
export class AuthScanPage {
  public wallet;

  public authDataForm: FormGroup;
  public description: string;
  public address: any;
  isDebugModeNoScanner: boolean;

  constructor(
    private profileProvider: ProfileProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private formBuilder: FormBuilder,
    private events: Events,
    private logger: Logger,
    private platformProvider: PlatformProvider,
    private errorsProvider: ErrorsProvider
  ) {
    this.authDataForm = this.formBuilder.group({
      authData: [
        '',
        Validators.compose([Validators.minLength(1), Validators.required])
      ]
    });

    this.events.subscribe('Local/AuthScan', this.handleAuth);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: AuthScanPage');
    let isCordova = this.platformProvider.isCordova;
    this.isDebugModeNoScanner = !isCordova;
    
    console.log("Can go back: " + this.navCtrl.canGoBack());

    if(isCordova) {
      this.openScanner();
    }
  }

  ionViewWillEnter() {
    this.wallet = this.profileProvider.getWallet(this.navParams.data.walletId);
    this.address = this.navParams.data.address;
  }

  ionViewWillLeave() {
    this.events.unsubscribe('Local/AuthScan', this.handleAuth);
  }
  
  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromAuthScan: true });
  }

  private handleAuth: any = data => {
    this.logger.info('AuthScan: handleAuth called');
    this.logger.info(data);

    // let loginData = this.parseInput(data.value);
    
    // if (loginData == null) {
    //   this.logger.error("Scanned auth URI was invalid")
    //   this.logger.error(data.value);
    //   return;
    // }

    // this.logger.info('Auth data scanned successfully');
    // this.logger.info(data.value);

    // this.navCtrl.push(ConfirmAuthPage, {
    //   message: loginData,
    //   walletId: this.navParams.data.walletId,
    //   signingAddress: this.address,
    //   expired: loginData
    // });
  }

  sign() {
    this.events.publish('Local/AuthScan', { value: this.authDataForm.value.authData });
  }

  private parseInput(message: string) {
    try {
      let url = new URL(message);

      return this.parseUrl(url);
    }
    catch (e) {
      this.errorsProvider.showDefaultError(e, "Unreadable scan");
      return null;
    }
  }

  private parseUrl(url: URL): AuthData {   
    return new AuthData(url);
  }
}
