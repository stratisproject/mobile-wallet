import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { Events, NavController, NavParams } from 'ionic-angular';
import { ErrorsProvider, PlatformProvider } from '../../providers';

// providers
import { AppProvider } from '../../providers/app/app';
import { Logger } from '../../providers/logger/logger';
import { AuthData } from "../../models/auth/authdata";

// validators
import { ScanPage } from '../scan/scan';
import { ConfirmAuthPage } from '../send/confirm-auth/confirm-auth';

@Component({
  selector: 'page-auth-scan-new',
  templateUrl: 'auth-scan-new.html'
})
export class AuthScanNewPage {
  public loginUrlForm: FormGroup;

  public isCordova: boolean;
  public appName: string;
  data: any;
  hasScanner: boolean;

  constructor(
    private navCtrl: NavController,
    private events: Events,
    private appProvider: AppProvider,
    private formBuilder: FormBuilder,
    private logger: Logger,
    private navParams: NavParams,
    private errorsProvider: ErrorsProvider,
    private platformProvider: PlatformProvider
  ) {
    this.loginUrlForm = this.formBuilder.group({
      url: [],
    });

    this.appName = this.appProvider.info.nameCase;
    this.events.subscribe('Local/AuthScan', this.updateAddressHandler);
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: AuthScanNew');

    if(this.platformProvider.isCordova) {
      this.openScanner();
    }
  }

  ngOnDestroy() {
    this.events.unsubscribe('Local/AuthScan', this.updateAddressHandler);
  }

  private updateAddressHandler: any = data => {
    this.logger.info("AuthScanNew: received data");
    this.logger.info(data);

    this.data = data.value;

    this.loginUrlForm.controls['url'].setValue(
      data.value
    );

    let loginData = this.parseInput(data.value);

    if (loginData == null) {
      this.logger.error("Scanned auth URI was invalid")
      this.logger.error(data.value);
      return;
    }

    this.logger.info('Auth data scanned successfully');
    this.logger.info(data.value);
    this.logger.info(loginData);
    this.logger.info(this.navParams.data);

    this.goToConfirm(loginData);
  };

  private goToConfirm(loginData: AuthData) {
    this.navCtrl.push(ConfirmAuthPage, {
      message: loginData,
      walletId: this.navParams.data.walletId,
    });
  }

  public confirm() {
    let loginData = this.parseInput(this.loginUrlForm.controls['url'].value);

    if (loginData == null) {
      this.logger.error("Scanned auth URI was invalid")
      return;
    }

    this.goToConfirm(loginData);
  }

  private parseInput(message: string) {
    try {
      let url = new URL(message);

      return new AuthData(url);
    }
    catch (e) {
      this.errorsProvider.showDefaultError(e, "Unreadable scan");
      return null;
    }
  }

  public openScanner(): void {
    this.navCtrl.push(ScanPage, { fromAuthScan: true });
  }
}
