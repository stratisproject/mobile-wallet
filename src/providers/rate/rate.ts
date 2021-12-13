import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import env from '../../environments';
import { ConfigProvider } from '../../providers/config/config';
import { CoinsMap, CurrencyProvider } from '../../providers/currency/currency';
import { Logger } from '../../providers/logger/logger';

const EXPIRATION_TIME_MS = 5 * 60 * 1000; // 5min

export interface ExchangeRate {
  rate: number;
  ts: number;
}

export enum DateRanges {
  Day = 1,
  Week = 7,
  Month = 30
}

export interface HistoricalRates {
  strax: ExchangeRate[];
  crs: ExchangeRate[];
}

@Injectable()
export class RateProvider {
  private alternatives;
  private rates = {} as CoinsMap<{}>;
  private ratesAvailable = {} as CoinsMap<boolean>;
  private rateServiceUrl = {} as CoinsMap<string>;

  private bwsURL: string;
  private ratesCache: any;

  constructor(
    private currencyProvider: CurrencyProvider,
    private http: HttpClient,
    private logger: Logger,
    private configProvider: ConfigProvider
  ) {
    this.logger.debug('RateProvider initialized');
    this.alternatives = {};
    for (const coin of this.currencyProvider.getAvailableCoins()) {
      this.rateServiceUrl[coin] = env.ratesAPI[coin];
      this.rates[coin] = { USD: 1 };
      this.ratesAvailable[coin] = false;
    }

    const defaults = this.configProvider.getDefaults();
    this.bwsURL = defaults.bws.url;
    this.ratesCache = {
      1: [],
      7: [],
      30: []
    };
    this.updateRates();
  }

  public setRate(chain: string, code: string, rate: number) {
    this.rates[chain][code] = rate;
  }

  public async updateRates(chain?: string): Promise<any> {
    if (chain) {
      if (!this.currencyProvider.getRatesApi()[chain]) return;

      try {
        let dataCoin = await this.getCoin(chain);
          
        _.each(dataCoin, currency => {
          if (currency && currency.code && currency.rate) {
            this.rates[chain][currency.code] = currency.rate;
          }
        });

        return;
      } catch(errorCoin) {
          this.logger.error(errorCoin);
          return;
      }
    } else {
      // Update all rates
      let res = await this.getRates();

      _.map(res, (rates, coin) => {
        const coinRates = {};
        _.each(rates, r => {
          if (r.code && r.rate) {
            const rate = { [r.code]: r.rate };
            Object.assign(coinRates, rate);
          }

          // set alternative currency list
          if (r.code && r.name) {
            this.alternatives[r.code] = { name: r.name };
          }
        });
        this.rates[coin] = !_.isEmpty(coinRates)
          ? coinRates
          : null;
        this.ratesAvailable[coin] = true;
      });
    }
  }

  // Gets all the rates from the server and puts them into a map.
  public async getRates(): Promise<any> {
    let rates = {};

    for (const coin of this.currencyProvider.getAvailableCoins()) {
      let ratesUrl = this.currencyProvider.getRatesApi()[coin];

      try {
        rates[coin] = await this.getCurrentRate(ratesUrl);
      }
      catch(err) {
        this.logger.error(err);
      }
    }

    return rates;
  }

  public getCoin(chain: string): Promise<any> {
    return new Promise(resolve => {
      this.http.get(this.rateServiceUrl[chain]).subscribe(data => {
        resolve(data);
      });
    });
  }

  public getRate(code: string, chain?: string, opts?: { rates? }): number {
    const customRate =
      opts && opts.rates && opts.rates[chain] && opts.rates[chain][code];
    if (customRate) return customRate;
    if (this.rates[chain][code]) return this.rates[chain][code];
    if (
      !this.rates[chain][code] &&
      this.rates[chain]['USD'] &&
      this.rates['btc'][code] &&
      this.rates['btc']['USD'] &&
      this.rates['btc']['USD'] > 0
    ) {
      const newRate = +(
        (this.rates[chain]['USD'] * this.rates['btc'][code]) /
        this.rates['btc']['USD']
      ).toFixed(2);
      return newRate;
    }
    this.logger.warn(
      'There are no rates for chain: ' + chain + ' - code: ' + code
    );
    return undefined;
  }

  private getAlternatives(): any[] {
    const alternatives: any[] = [];
    for (let key in this.alternatives) {
      alternatives.push({ isoCode: key, name: this.alternatives[key].name });
    }
    return alternatives;
  }

  public isCoinAvailable(chain: string) {
    return this.ratesAvailable[chain];
  }

  public isAltCurrencyAvailable(currency: string) {
    return this.alternatives[currency];
  }

  public toFiat(
    satoshis: number,
    code: string,
    chain,
    opts?: { customRate?: number; rates? }
  ): number {
    if (!this.isCoinAvailable(chain)) {
      return null;
    }
    const customRate = opts && opts.customRate;
    const rate = customRate || this.getRate(code, chain, opts);
    return (
      satoshis *
      (1 / this.currencyProvider.getPrecision(chain).unitToSatoshi) *
      rate
    );
  }

  public fromFiat(
    amount: number,
    code: string,
    chain,
    opts?: { rates? }
  ): number {
    if (!this.isCoinAvailable(chain)) {
      return null;
    }
    return (
      (amount / this.getRate(code, chain, opts)) *
      this.currencyProvider.getPrecision(chain).unitToSatoshi
    );
  }

  public listAlternatives(sort: boolean) {
    const alternatives = this.getAlternatives();
    if (sort) {
      alternatives.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });
    }
    return _.uniqBy(alternatives, 'isoCode');
  }

  public whenRatesAvailable(chain: string): Promise<any> {
    return new Promise(resolve => {
      if (this.ratesAvailable[chain]) resolve();
      else {
        if (chain) {
          this.updateRates(chain).then(() => {
            resolve();
          });
        }
      }
    });
  }

  public getHistoricFiatRate(
    currency: string,
    coin: string,
    ts: string
  ): Promise<any> {
    return new Promise(resolve => {
      const url = `${this.bwsURL}/v1/fiatrates/${currency}?coin=${coin}&ts=${ts}`;
      this.http.get(url).subscribe(data => {
        resolve(data);
      });
    });
  }

  public getLastDayRates(): Promise<HistoricalRates> {
    const fiatIsoCode =
      this.configProvider.get().wallet.settings.alternativeIsoCode || 'USD';

    return this.fetchHistoricalRates(fiatIsoCode, DateRanges.Day).then(x => {
      let ret = {};
      _.map(x, (v, k) => {
        ret[k] = _.last(v).rate;
      });
      return ret as HistoricalRates;
    });
  }

  public fetchHistoricalRates(
    fiatIsoCode: string,
    dateRange: DateRanges = DateRanges.Day
  ): Promise<HistoricalRates> {
    const now = Date.now();
    if (
      _.isEmpty(this.ratesCache[dateRange].data) ||
      this.ratesCache[dateRange].expiration < now
    ) {
      this.logger.debug(
        `Refreshing Exchange rates for ${fiatIsoCode} period ${dateRange}`
      );

      // Get the rates object into the expected format
      const req = this.getRates()
      .then(rate => {
        return {
          strax: [{
            rate: rate['strax']?.find(i => i.code == fiatIsoCode)?.rate,
            ts: now
          }] as ExchangeRate[],
          crs: [{
            rate: rate['crs']?.find(i => i.code == fiatIsoCode)?.rate,
            ts: now
          }] as ExchangeRate[]
        } as HistoricalRates;
      });
      this.ratesCache[dateRange].data = req;
      this.ratesCache[dateRange].expiration = now + EXPIRATION_TIME_MS;
    }
    return this.ratesCache[dateRange].data;
  }

  public getCurrentRate(ratesApiUrl: string): Promise<[{ code: string, rate: string, name: string }]> {
    return this.http.get<any>(ratesApiUrl).toPromise();
  }
}
