import {expect} from 'chai';
import {describe, it} from 'mocha';
import {temperatureAt} from '../src/temperatures.js';
import {DateTime} from 'luxon';

describe('Getting the temperature', () => {

  it('at a given time should return a valid value', () => {
    const time = '09:13';
    const value = temperatureAt(DateTime.fromISO(time));
    expect(value).to.be.a('number');
    expect(value).to.be.below(16.583333333333332);
    expect(value).to.be.above(16.249999999999996);
    console.debug(`Temperature at ${time}: ${value}`);
  });

  it('at a known time should return an exact value', () => {
    const time = '10:15';
    const value = temperatureAt(DateTime.fromISO(time));
    expect(value).to.be.a('number');
    expect(value).to.be.eq(17.866666666666667);
    console.debug(`Temperature at ${time}: ${value}`);
  });

});
