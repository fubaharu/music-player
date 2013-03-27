#!/usr/bin/gjs

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gst = imports.gi.Gst;
const Gio = imports.gi.Gio;
const Gda = imports.gi.Gda;
const Lang = imports.lang;

const musicPlayer = new Lang.Class({
	Name: 'Music Player',

	// Create the application itself
    _init: function() {
        this.application = new Gtk.Application({
			application_id: 'org.gnome.music-player',
            flags: Gio.ApplicationFlags.FLAGS_NONE
		});

        Gtk.init(null, 0);
		Gst.init(null, 0);
		this.sound = new Gst.ElementFactory.make("playbin","play");
		this.soundURI = "";

		this._listStore = new Gtk.ListStore ();
		this._listStore.set_column_types ([ GObject.TYPE_STRING, GObject.TYPE_STRING ]);

		// Connect 'activate' and 'startup' signals to the callback functions
		this.application.connect('activate', Lang.bind(this, this._onActivate));
		this.application.connect('startup', Lang.bind(this, this._onStartup));
    },

    // Callback function for 'activate' signal presents windows when active
    _onActivate: function() {
        this._window.present();
    },

    // Callback function for 'startup' signal builds the UI
    _onStartup: function() {
    	this._initMenus ();
    	this._mainWindow ();
    },

    //create the menu items and connect the signals to the callback functions.
    _initMenus: function() {
        let menu = new Gio.Menu();
        menu.append("About", 'app.about');
        menu.append("Quit",'app.quit');
        this.application.set_app_menu(menu);
		
        let aboutAction = new Gio.SimpleAction ({ name: 'about' });
        aboutAction.connect('activate', Lang.bind(this,
            function() {
                this._showAbout();
            }));
        this.application.add_action(aboutAction);

        let quitAction = new Gio.SimpleAction ({ name: 'quit' });
        quitAction.connect('activate', Lang.bind(this,
            function() {
                this._window.destroy();
            }));
         this.application.add_action(quitAction);
    },

    _mainWindow: function() {
    	// Create the application window
        this._window = new Gtk.ApplicationWindow({
            application: this.application,
            window_position: Gtk.WindowPosition.CENTER,
            border_width: 0,
            title: "GNOME Music Player",
			default_height: 100,
			default_width: 1024
		});

        this._createToolbar();

        this._grid = new Gtk.Grid ({ column_homogeneous: true });
        this._grid.attach(this._toolbar, 0, 0, 1, 1);

        this._soundList = new Gtk.TreeView ({ expand: true, model: this._listStore });
		let fileName = new Gtk.TreeViewColumn ({ title: "File Name" });
		//let bold = new Gtk.CellRendererText ({ weight: Pango.Weight.BOLD });
		let normal = new Gtk.CellRendererText ();
		fileName.pack_start (normal, true);
		fileName.add_attribute (normal, "text", 0);
		this._soundList.insert_column (fileName, 0);
		this._grid.attach(this._soundList, 0, 1, 1, 1);

		this.selection = this._soundList.get_selection ();
		this.selection.connect ('changed', Lang.bind (this, this._onSelectionChanged));

        this._window.add(this._grid);
		this._window.show_all();
    },

    _createToolbar: function() {
    	this._toolbar = new Gtk.Toolbar();
    	this._toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_PRIMARY_TOOLBAR);

    	let openAction = new Gio.SimpleAction({ name: 'open'});
        openAction.connect('activate', Lang.bind(this,
            function() {
                this._openAction();
            })
        );
        this.application.add_action(openAction);

        this._openButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_OPEN);
        this._openButton.is_important = false;
        this._toolbar.add(this._openButton);
        this._openButton.show();
        this._openButton.action_name = "app.open";

    	this._seperator = new Gtk.SeparatorToolItem();
    	this._toolbar.add(this._seperator);
    	this._seperator.show();
    	
        let playAction = new Gio.SimpleAction({ name: 'play'});
        playAction.connect('activate', Lang.bind(this,
            function() {
                this._playAction();
            })
        );
        this.application.add_action(playAction);

        this._playButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_MEDIA_PLAY);
        this._playButton.is_important = false;
        this._toolbar.add(this._playButton);
        this._playButton.show();
        this._playButton.action_name = "app.play";

        let stopAction = new Gio.SimpleAction({ name: 'stop'});
        stopAction.connect('activate', Lang.bind(this,
        	function() {
        		this._stopAction();
        	})
        );
        this.application.add_action(stopAction);

        this._stopButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_MEDIA_STOP);
        this._stopButton.is_important = false;
        this._toolbar.add(this._stopButton);
        this._stopButton.show();
        this._stopButton.action_name = "app.stop";

        let previousAction = new Gio.SimpleAction({ name: 'previous'});
        previousAction.connect('activate', Lang.bind(this,
        	function() {
        		this._previousAction();
        	})
        );
        this.application.add_action(previousAction);

        this._previousButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_MEDIA_PREVIOUS);
        this._previousButton.is_important = false;
        this._toolbar.add(this._previousButton);
        this._previousButton.show();
        this._previousButton.action_name = "app.previous";

        let nextAction = new Gio.SimpleAction({ name: 'next'});
        nextAction.connect('activate', Lang.bind(this,
        	function() {
        		this._nextAction();
        	})
        );
        this.application.add_action(nextAction);

        this._nextButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_MEDIA_NEXT);
        this._nextButton.is_important = false;
        this._toolbar.add(this._nextButton);
        this._nextButton.show();
        this._nextButton.action_name = "app.next";
    },

    _onSelectionChanged: function() {
    	print("Selection has changed...");

    	this.sound.set_state(Gst.State.NULL);
    	let [ isSelected, model, iter ] = this.selection.get_selected();
    	this.sound.uri = this._listStore.get_value (iter, 1);
    	this.sound.set_state(Gst.State.PLAYING);
    },

    // Open a File (, add it to playlist --> Later!!!) and play it.
    _openAction: function() {
    	this.openDialog = new Gtk.FileChooserDialog ({ 
			action: 1, 
			select_multiple: false, 
			local_only: false, 
			modal: false 
		});
	
		this.openDialog.add_button(Gtk.STOCK_OPEN, Gtk.ResponseType.ACCEPT);
		this.openDialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);

		var dialog = this.openDialog.run();
		if (dialog == Gtk.ResponseType.ACCEPT) {
			this._listStore.set (this._listStore.append(), [0, 1], [Gda.value_stringify (this.openDialog.get_filename()), Gda.value_stringify(this.openDialog.get_uri())]);
			this.openDialog.destroy();
		} else if (dialog == Gtk.ResponseType.CANCEL) {
			this.openDialog.destroy();
		}
    },

    _playAction: function() {
    	if (this.sound.get_state(Gst.State.PLAYING)) {
    		this.sound.set_state(Gst.State.PAUSED);
    		print("Pausing sound...");
    	} else if (this.sound.get_state(Gst.State.PAUSED)) {
    		this.sound.set_state(Gst.State.PLAYING);
    		print("Playing sound...");
    	}
    },

    _stopAction: function() {
    	if (this.sound.get_state(Gst.State.PLAYING)) {
    		this.sound.set_state(Gst.State.NULL);
    		print("Stopping sound...");
    	}
    },

    _previousAction: function() {
    	print("[WARNING] This still hasn't been implemented!");
    },

    _nextAction: function() {
    	print("[WARNING] This still hasn't been implemented!");
    },

    _showAbout: function() {

        // String arrays of the names of the people involved in the project
        var authors = ["Thomas Siladi"];
        var documenters = ["Thomas Siladi"];

        // Create the About dialog
        let aboutDialog = new Gtk.AboutDialog({ 
        	title: "Music Player",
            program_name: "A Music Player for GNOME 3\nUsing GNOME 3 Javascript.",
            copyright: "Copyright \xa9 2013 Thomas Siladi",
            authors: authors,
            documenters: documenters,
            website: "http://www.google.com",
            website_label: "No Homepage Avaible" 
        });

        // Attach the About dialog to the window
        aboutDialog.modal = true;
        aboutDialog.transient_for = this._window;

        // Show the About dialog
        aboutDialog.show();

        // Connect the Close button to the destroy signal for the dialog
        aboutDialog.connect('response', function() {
            aboutDialog.destroy();
        });
    },
});

// Run the application
let app = new musicPlayer ();
app.application.run (ARGV);