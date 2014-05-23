var request = function request(options, cb) {
  if (typeof options === "string") {
    options = {url: options};
  }

  options.error = function(xhr, errorType, error) {
    return cb(Error(error), xhr);
  };

  options.success = function onSuccess(data, status, xhr) {
    return cb(null, xhr, data);
  };

  return $.ajax(options);
};

var ItemModel = Backbone.Model.extend({
  defaults: function defaults() {
    return {
      sticky: false,
      type: "info",
      title: null,
      content: null,
    };
  },
});

var ItemCollection = Backbone.Collection.extend({
  model: ItemModel,
  url: "/item",
  comparator: function(a, b) {
    if (a.sticky && !b.sticky) {
      return 1;
    }
    if (!a.sticky && b.sticky) {
      return -1;
    }
    if (a.time > b.time) {
      return 1;
    }
    if (a.time < b.time) {
      return -1;
    }

    return 0;
  },
  comparator: "time",
});

var Layout = Backbone.Marionette.Layout.extend({
  template: "#template-layout",
  regions: {
    content: "#content",
  },
});

var ErrorView = Backbone.Marionette.ItemView.extend({
  tagName: "div",
  className: "error",
  template: "#template-error",
});

var ItemCollectionElementView = Backbone.Marionette.ItemView.extend({
  tagName: "li",
  className: "col-xs-12 col-sm-6 col-md-4 col-lg-3",
  template: "#template-item-collection-element",
  templateHelpers: {
    formatTime: function(){
        var options = {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }
        var date = new Date(this.time)
        return date.toLocaleTimeString(navigator.language, options)
    },
    glyphicon: function glyphicon() {
      switch (this.type) {
        case "question": return "question-sign";
        case "info": return "info-sign";
        case "notice": return "exclamation-sign";
        case "love": return "heart";
        case "user": return "user";
        default: return this.type;
      }
    },
  },
});

var ItemCollectionView = Backbone.Marionette.CollectionView.extend({
  tagName: "ul",
  className: "items",
  itemView: ItemCollectionElementView,
  appendHtml: function(collectionView, itemView) {
    collectionView.$el.prepend(itemView.el);
  },
});

$(function() {
  var initialData = JSON.parse($("#initial-data").text());
  var socket = io.connect();

  var itemCollection = new ItemCollection();

  itemCollection.reset(initialData.items);

  socket.on("item", function(item) {
    itemCollection.add(item);
  });

  var layout = new Layout().render();

  var itemCollectionView = new ItemCollectionView({
    collection: itemCollection,
  });

  layout.content.show(itemCollectionView);

  document.body.appendChild(layout.el);
});
