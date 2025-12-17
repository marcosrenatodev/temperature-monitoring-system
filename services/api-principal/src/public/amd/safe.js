/*
  Minimal AMD module compatible with the subset of `safe` (safejs) APIs used by TinyBone.
*/
define(function () {
  'use strict';

  function back(cb) {
    if (typeof cb !== 'function') return;
    var args = Array.prototype.slice.call(arguments, 1);
    try { cb.apply(null, args); } catch (_) {}
  }

  function sure(cb, fn) {
    return function (err) {
      if (err) return back(cb, err);
      var args = Array.prototype.slice.call(arguments, 1);
      try { fn.apply(null, args); } catch (e) { back(cb, e); }
    };
  }

  function trap(ecb, fn) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (e) { back(ecb, e); }
    };
  }

  function run(work, cb) {
    try { work(cb); } catch (e) { back(cb, e); }
  }

  function each(arr, iterator, cb) {
    arr = arr || [];
    var i = 0;
    (function next(err) {
      if (err) return back(cb, err);
      if (i >= arr.length) return back(cb);
      try { iterator(arr[i++], next); } catch (e) { back(cb, e); }
    })();
  }

  function parallel(tasks, cb) {
    var keys = Object.keys(tasks || {});
    var pending = keys.length;
    var out = {};
    if (!pending) return back(cb, null, out);

    keys.forEach(function (k) {
      try {
        tasks[k](function (err, res) {
          if (err) { pending = 0; return back(cb, err); }
          out[k] = res;
          pending -= 1;
          if (pending === 0) back(cb, null, out);
        });
      } catch (e) {
        pending = 0;
        back(cb, e);
      }
    });
  }

  return { back: back, sure: sure, trap: trap, run: run, each: each, parallel: parallel };
});
