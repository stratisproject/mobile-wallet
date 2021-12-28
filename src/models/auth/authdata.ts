import { Url } from 'url';


export class AuthData {
  // public url: Url;
  // public expiry: Date;
  // public messageToSign: string;
  // public callbackUrl: string;
  public messageToSign: string;
  public callbackUrl: Url;
  public expiry?: Date;

  constructor(public uri: URL) {
    if (uri.protocol !== "sid:")
      throw new Error("Only sid: protocols are supported in auth URLs");

    this.messageToSign = uri.href.replace(uri.protocol, "");
    this.callbackUrl = new URL(uri.href.replace(uri.protocol, "https://"));

    let exp = uri.searchParams.get("exp");
    let expInt = parseInt(exp, 10);
    if (!isNaN(expInt)) {
      this.expiry = new Date(expInt * 1000); // Expiry is unix time, JS date is scaled by 1000 
    }
  }

  expired() {
    if (this.expiry == null)
      return false;

    let now = new Date();
    return (this.expiry.valueOf() - now.valueOf()) < 0;
  }
}
