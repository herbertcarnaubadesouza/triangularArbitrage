module.exports = function (store, options) {
  if (!store) {
    throw new Error('must provide store');
  }
  options || (options = {})
  if (!options.toId) {
    options.toId = function (obj) {
      return obj.id;
    };
  }
  function makeCb (cb) {
    return function () {
      var args = [].slice.call(arguments)
      setImmediate(function () {
        cb.apply(api, args)
      })
    }
  }
  var api = {
    load: function (id, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
      opts || (opts = {});
      cb = makeCb(cb)
      if (typeof id !== 'string' || !id) {
        var err = new Error('must provide id string to load');
        return cb(err);
      }
      store.load(id, opts, function (err, obj) {
        if (err) return cb(err);
        if (options.load && opts.hooks !== false && obj) {
          options.load.call(api, obj, opts, cb);
        }
        else cb(null, obj);
      });
    },
    save: function (obj, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
      opts || (opts = {});
      cb = makeCb(cb)
      if (!obj || toString.call(obj) !== '[object Object]') {
        var err = new Error('must provide obj to save');
        return cb(err);
      }
      var id = options.toId(obj);
      if (typeof id !== 'string' || !id) {
        var err = new Error('could not get id string to save');
        err.obj = obj;
        return cb(err);
      }
      if (options.save && opts.hooks !== false) {
        options.save.call(api, obj, opts, function (err, retObj) {
          if (err) {
            err.saved = false;
            return cb(err);
          }
          withHooks(retObj || obj);
        });
      }
      else withHooks(obj);

      function withHooks (obj) {
        store.save(id, obj, opts, function (err, retObj) {
          if (err) {
            err.saved = false;
            err.obj = obj;
            return cb(err);
          }
          if (retObj) obj = retObj;
          if (options.afterSave && opts.hooks !== false) {
            options.afterSave.call(api, obj, opts, function (err, retObj) {
              if (err) {
                err.saved = true;
                err.obj = obj;
                return cb(err);
              }
              cb(null, retObj || obj);
            });
          }
          else cb(null, obj);
        });
      }
    },
    destroy: function (id, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
      opts || (opts = {});
      cb = makeCb(cb)
      var inputObj = null;
      if (toString.call(id) === '[object Object]') {
        inputObj = id;
        id = options.toId(obj);
      }
      if (typeof id !== 'string' || !id) {
        var err = new Error('must provide id string to destroy');
        err.id = id;
        return cb(err);
      }
      store.destroy(id, opts, function (err, obj) {
        if (err) {
          err.saved = false;
          err.id = id;
          return cb(err);
        }
        if (!obj) obj = inputObj;
        if (options.destroy && opts.hooks !== false && obj) {
          options.destroy.call(api, obj, opts, function (err, retObj) {
            if (err) {
              err.saved = true;
              err.obj = obj;
              return cb(err);
            }
            cb(null, retObj || obj);
          });
        }
        else cb(null, obj);
      });
    },
    select: function (opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
      opts || (opts = {});
      cb = makeCb(cb)
      store.select(opts, function (err, objs) {
        if (err) return cb(err);
        var latch = objs.length, errored = false;
        if (latch && options.load && opts.hooks !== false) {
          objs.forEach(function (obj, idx) {
            if (!obj || toString.call(obj) !== '[object Object]') {
              errored = true;
              var err = new Error('store returned non-object');
              err.obj = obj;
              return cb(err);
            }
            options.load.call(api, obj, opts, function (err, retObj) {
              if (errored) return;
              if (err) {
                errored = true;
                err.obj = obj;
                return cb(err);
              }
              objs[idx] = retObj || obj;
              if (!--latch) return cb(null, objs);
            });
          });
        }
        else cb(null, objs);
      });
    }
  };

  Object.keys(options.methods || {}).forEach(function (k) {
    api[k] = options.methods[k].bind(api);
  });

  return api;
};
