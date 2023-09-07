var crypto = require('crypto');

module.exports = function (coll_name, backend_options) {
  backend_options || (backend_options = {});

  if (!backend_options.db) throw new Error('must pass a node-mongodb-native db with backend_options.db');
  var db = backend_options.db;

  function escapeBase64 (str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  function hash (id) {
    return escapeBase64(crypto.createHash('sha1').update(id).digest('base64'))
  }

  var coll_path = coll_name;
  if (backend_options.key_prefix && backend_options.key_prefix.length) {
    coll_path += '.' + backend_options.key_prefix.map(hash).join('.')
  }

  var coll = db.collection(coll_path);

  return {
    load: function (id, opts, cb) {
      coll.findOne({_id: id}, opts, function (err, doc) {
        if (err) return cb(err)
        if (doc) delete doc._id
        cb(null, doc)
      });
    },
    save: function (id, obj, opts, cb) {
      var tmp_obj = JSON.parse(JSON.stringify(obj))
      tmp_obj._id = id
      coll.save(tmp_obj, function (err, result) {
        var doc = result && result.upserted
        if (doc) {
          delete doc._id
        }
        cb(err, doc)
      })
    },
    destroy: function (id, opts, cb) {
      if (typeof opts.w === 'undefined') opts.w = 1;
      this.load(id, {}, function (err, obj) {
        if (err) return cb(err);
        if (!obj) return cb(null, null);
        coll.deleteOne({_id: id}, opts, function (err) {
          if (err) return cb(err);
          cb(null, obj);
        });
      });
    },
    select: function (opts, cb) {
      if (typeof opts.query === 'undefined') opts.query = {};
      var cursor = coll.find(opts.query);
      if (typeof opts.project === 'object') cursor = cursor.project(opts.project);
      if (typeof opts.comment === 'string') cursor = cursor.comment(opts.comment);
      if (typeof opts.hint === 'object') cursor = cursor.hint(opts.hint);
      if (typeof opts.limit === 'number') cursor = cursor.limit(opts.limit);
      if (typeof opts.skip === 'number') cursor = cursor.skip(opts.skip);
      if (typeof opts.sort === 'object') cursor = cursor.sort(opts.sort);
      cursor.toArray(function (err, docs) {
        if (err) return cb(err)
        docs = docs.map(function (doc) {
          delete doc._id
          return doc
        })
        cb(null, docs)
      })
    }
  };
};