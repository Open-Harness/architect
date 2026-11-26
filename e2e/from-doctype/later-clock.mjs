// Loaded with `node --import` by support.ts's `scaffoldLater`: every clock the process reads runs 400 days on, so a
// scaffold that writes the day (or the time) into a file writes different bytes than the same run today.
const shift = 400 * 24 * 60 * 60 * 1000;
const RealDate = globalThis.Date;
class LaterDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + shift);
    else super(...args);
  }
  static now() {
    return RealDate.now() + shift;
  }
}
globalThis.Date = LaterDate;
