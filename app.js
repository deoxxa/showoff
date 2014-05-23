#!/usr/bin/env node

var connect_leg = require("connect-leg"),
    express = require("express"),
    fs = require("fs"),
    http = require("http"),
    log = require("leg")(process.stdout),
    mongo = require("mongoskin"),
    randomId = require("proquint-random-id"),
    socketio = require("socket.io");

var db = mongo.db("mongodb://nan.campjs/showoff"),
    items = db.collection("items");

var sessionId = randomId();

var app = express();
var server = http.createServer(app);
var io = socketio.listen(server, {"log level": 0});

app.use(connect_leg.logger(log, {
  application: {
    processId: process.pid,
    sessionId: sessionId,
  },
}));

app.use(app.router);

app.use(express.static(__dirname + "/public"));

app.use(connect_leg.errorHandler(log, {
  application: {
    processId: process.pid,
    sessionId: sessionId,
  },
}));

io.sockets.on("connection", function(socket) {
  log.info("socket.io connection", {
    application: {
      processId: process.pid,
      sessionId: sessionId,
    },
    socketio: {
      socket: {
        _id: socket.id,
      },
    },
  });

  socket.on("disconnect", function() {
    log.info("socket.io disconnection", {
      application: {
        processId: process.pid,
        sessionId: sessionId,
      },
      socketio: {
        socket: {
          _id: socket.id,
        },
      },
    });
  });
});

app.get("/(index.html)?", function(req, res, next) {
  return fs.readFile("./public/index.html", "utf8", function(err, data) {
    if (err) {
      return next(err);
    }

    return items.find({deleted: {$ne: true}}).sort({sticky: -1, time: -1}).limit(20).toArray(function(err, docs) {
      if (err) {
        return next(err);
      }

      res.type("html");

      return res.send(data.replace("__INITIAL_DATA__", JSON.stringify({
        items: docs,
      })));
    });
  });
});

app.get("/item", function(req, res, next) {
  var q = {
    deleted: {$ne: true},
  };

  if (req.query.since) {
    q.time = {$gt: req.query.since};
  }

  return items.find(q).sort({time: -1}).limit(Math.min(100, req.query.limit || 20)).toArray(function(err, docs) {
    if (err) {
      return next(err);
    }

    return res.json({
      items: docs.reverse(),
    });
  });
});

app.post("/item", express.json(), function(req, res, next) {
  var item = req.body;

  item._id = randomId();
  item.time = new Date().toISOString();

  return items.save(item, function(err) {
    if (err) {
      return next(err);
    }

    io.sockets.emit("item", item);

    res.status(303);
    res.set("location", "/item/" + item._id);
    return res.end();
  });
});

app.get("/item/:id", function(req, res, next) {
  return items.findOne({_id: req.params.id, deleted: {$ne: true}}, function(err, item) {
    if (err) {
      return next(err);
    }

    if (!item) {
      return next(new http_error.NotFound("couldn't find item with id `" + req.params.id + "'"));
    }

    return res.json(item);
  });
});

app.delete("/item/:id", function(req, res, next) {
  return items.findOne({_id: req.params.id, deleted: {$ne: true}}, function(err, item) {
    if (err) {
      return next(err);
    }

    if (!item) {
      return next(new http_error.NotFound("couldn't find item with id `" + req.params.id + "'"));
    }

    item.deleted = true;

    return res.save(item, function(err) {
      if (err) {
        return next(err);
      }

      io.sockets.emit("deleted", item._id);

      return res.end();
    });
  });
});

server.listen(process.env.PORT || 3000, function() {
  log.info("listening", {
    application: {
      processId: process.pid,
      sessionId: sessionId,
    },
  });
});
