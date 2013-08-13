;(function(){
  "use strict";

  // Detect if the DOM is ready.
  var DOMREADY = false;

  var toEvents = function(string) {
    return string.replace(/ +/, " ").split(" ");
  };

  // Hold the guid id.
  var guid = 0;

  // Set the event callback dispatcher.
  // This function will wrap the event and execute
  // the correct callbacks.
  var dispatcher = function(event){
    // Set the element.
    var element = this;

    // Retrieve the attached events for the
    // triggered event.
    var callbacks = element.events[event.type];

    // Set the element that triggered the event.
    var target = event.target;

    callbacks.forEach(function(options){
      // Set the callback context.
      var context = options.context || element;

      // If no selector has been given, then execute
      // the callback right away!
      if (typeof(options.selector) !== "string") {
        return options.callback.call(context, event);
      }

      // Select elements that match the specified selector.
      // This elements will be used to check the
      var set = element.querySelectorAll(options.selector);

      // Let's see if the current selector matches the
      // event target.
      var matched = Array.prototype.some.call(set, function(item){
        return item === target;
      });

      // If it does match, the execute the callback.
      if (matched) {
        options.callback.call(context, event);
      }
    });
  };

  // Deal with DOMContentLoaded and the fallback.
  var onDomReady = function(callback) {
    document.on("readystatechange", function(event){
      if (document.readyState === "complete" && !DOMREADY) {
        DOMREADY = true;
        callback.call(document, event);
      }
    });

    document.on("DOMContentLoaded", function(event){
      if (!DOMREADY) {
        DOMREADY = true;
        callback.call(document, event);
      }
    });

    window.on("load", function(event){
      if (!DOMREADY) {
        DOMREADY = true;
        callback.call(document, event);
      }
    });
  };

  // Listen to events.
  //
  //     window.on("load", callback);
  //     document.querySelector(".list").on("click", ".remove", callback);
  //
  var on = function(events, selector, callback, context) {
    // Deal with transition events.
    if (events === "transitionend") {
      events = "transitionend webkitTransitionEnd oTransitionend MSTransitionEnd";
    }

    // Normalize spaces in multiple events.
    events = toEvents(events);

    // Hold the instance in its own var.
    var element = this;

    // Deal with DOMContentLoaded.
    if (events[0] === "ready") {
      return onDomReady(selector);
    }

    // Initialize the events object.
    if (!element.events) {
      element.events = {};
    }

    // Transpose arguments.
    if (typeof(selector) === "function") {
      context = callback;
      callback = selector;
      selector = null;
    }

    // Iterate each event and listen to it.
    events.forEach(function(event){
      // If the event hasn't been created before,
      // do it now. Also listen to the event once,
      // so we can execute all attached callbacks
      // in the right order.
      if (!element.events[event]) {
        element.events[event] = [];
        element.addEventListener(event, dispatcher);
      }

      // If context has been provided, bind callback to it.
      callback = context ? callback.bind(context) : callback;

      // Set the guid if isn't set yet.
      if (!callback.guid) {
        callback.guid = (++guid);
      }

      // The this event to the list.
      // The callback will be bound to the
      // detected context.
      element.events[event].push({
          selector: selector
        , callback: callback
      });
    });

    // Make it chainable.
    return element;
  };

  // Unbind events.
  //
  //    document.body.off("click");
  //    document.querySelector("textarea").off("keydown keyup");
  //    document.body.off("click", ".button");
  //    document.body.off("click", callback);
  //    document.body.off("click", ".button", callback);
  //
  var off = function(events, selector, callback) {
    // Set the events.
    events = toEvents(events);

    // Set the element.
    var element = this;

    // If no events are found, exit.
    if (!element.events) {
      return;
    }

    // Transpose arguments.
    if (typeof(selector) === "function") {
      callback = selector;
      selector = null;
    }

    events.forEach(function(event){
      var callbacks = element.events[event];

      if (!callbacks) {
        return;
      }

      callbacks.forEach(function(options, index){
        var remove = (!selector || selector === options.selector) &&
                     (!callback || callback.guid === options.callback.guid)
        ;

        remove && callbacks.splice(index, 1);
      });

      if (callbacks.length === 0) {
        element.removeEventListener(event, dispatcher);
      }
    });

    return element;
  };

  // Trigger event.
  var trigger = function(event) {
    var data = Array.prototype.slice.call(arguments, 1);

    if (typeof(event) === "string") {
      var type = event;

      event = document.createEvent("HTMLEvents");
      event.initEvent(type, true, true);
    }

    event.data = data;
    this.dispatchEvent(event);

    return this;
  };

  // Detect the addEventListener/removeEventListener support.
  // IE8 still uses the attachEvent scheme, so
  // we're just emulating correct behavior.
  if (!Element.prototype.addEventListener) {
    HTMLDocument.prototype.addEventListener = Element.prototype.addEventListener = Window.prototype.addEventListener = function(event, callback) {
      this.attachEvent("on" + event, function(event){
        event.target = event.srcElement;
        callback.call(this, event);
      }.bind(this));
    };

    HTMLDocument.prototype.removeEventListener = Element.prototype.removeEventListener = Window.prototype.removeEventListener = function(event, callback) {
      this.detachEvent("on" + event, callback);
    };

    HTMLDocument.prototype.dispatchEvent = Element.prototype.dispatchEvent = Window.prototype.dispatchEvent = function(event) {
      this.fireEvent("on" + event.type, event);
    };
  }

  // Yep! By this point you probably noticed that oldIE
  // is so much different than event standard.
  // Here we go again!
  if (!document.createEvent) {
    document.createEvent = function() {
      return document.createEventObject();
    };

    Event.prototype.initEvent = function(event, bubbles, cancelable) {
      this.eventType = event;
      this.type = event;
      this.bubbles = bubbles;
      this.cancelable = cancelable;
    };
  }

  // Detect the stopPropagation and preventDefault support.
  // IE8 will still require special attributes, so just normalize it.
  // TODO: Consider event.cancelable and event.bubbles properties.
  if (!Event.prototype.stopPropagation) {
    Event.prototype.stopPropagation = function() {
      this.cancelBubble = true;
    };

    Event.prototype.preventDefault = function() {
      this.returnValue = false;
    };
  }

  // Set the event listeners.
  document.on = Window.prototype.on = Element.prototype.on = on;
  document.off = Window.prototype.off = Element.prototype.off = off;
  document.trigger = Window.prototype.trigger = Element.prototype.trigger = trigger;
})();
