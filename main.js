#!/usr/bin/gjs

const GObject = imports.gi.GObject;
const Pango = imports.gi.Pango;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gda = imports.gi.Gda;
const Lang = imports.lang;

const persona = new Lang.Class({
    Name: 'PERSONA',

    // Create the application itself
    _init: function() {
        this.application = new Gtk.Application({
			application_id: 'org.persona.persona-gtk',
            flags: Gio.ApplicationFlags.FLAGS_NONE
		});

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
    	this._setupDatabase ();
		this._selectData ();
        this._buildLoginWindow ();
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

	_setupDatabase: function() {
		this.connection = new Gda.Connection ({
			provider: Gda.Config.get_provider("MySQL"),
			cnc_string: "DB_DIR=127.0.0.1;DB_NAME=persona",
			auth_string: "USERNAME=persona;PASSWORD=anosrep"
		});
		this.connection.open();
		
		try {
			var dm = this.connection.execute_select_command("SELECT * FROM demo");
		} catch (e) {
			this._messageDialog = new Gtk.MessageDialog ({
            	modal: true,
            	buttons: Gtk.ButtonsType.OK,
            	message_type: Gtk.MessageType.WARNING,
            	text: e.toString()
            });
            this._messageDialog.connect ('response', Lang.bind(this, this._destroyMessage));
        	this._messageDialog.show();
        	
			this.connection.execute_non_select_command("create table demo (id integer, name varchar(100))");
		}
	},
	
	_selectData: function () {
		var dm = this.connection.execute_select_command("SELECT * FROM demo ORDER BY 2, 3");
		var iter = dm.create_iter ();
		
		// Creating ListStore
		this._listStore = new Gtk.ListStore ();
		this._listStore.set_column_types ([ GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_STRING ]);
		
		while (iter.move_next ()) {
			this._listStore.set (this._listStore.append(), [0, 1, 2, 3],
				[Gda.value_stringify (iter.get_value_at (0)), Gda.value_stringify (iter.get_value_at (1)), Gda.value_stringify (iter.get_value_at (2)), "Just a desc..."]);
		}
	},
	
	// Build the application's UI
    _buildLoginWindow: function() {

        // Create the application window
        this._window = new Gtk.ApplicationWindow({
            application: this.application,
            window_position: Gtk.WindowPosition.CENTER,
            border_width: 0,
            title: "Login - PERSONA",
			default_height: 170,
			default_width: 400
		});

        // Create the Grid
        this._grid = new Gtk.Grid ({
            column_homogeneous: true,
            // column_spacing: 20,
            //row_spacing: 20 
        });

        this._header = new Gtk.Label ({ label: "PERSONA", margin_bottom: 10 });
        this._labelUsername = new Gtk.Label ({ label: "Username:" });
        this._entryUsername = new Gtk.Entry ();
        this._labelPassword = new Gtk.Label ({ label: "Password:" });
        this._entryPassword = new Gtk.Entry ();
        	this._entryPassword.set_visibility(false);
        this._switchRememberPW = new Gtk.Switch ({ active: "true" });
        this._labelRememberPW = new Gtk.Label ({ label: "Remember Password?" });
        this._buttonLogin = new Gtk.Button ({ label: "Login", margin_top: 10 });
        //this._button = new Gtk.Button ({ label: "Show About" });

        // Bind it to a function that says what to do when the button is clicked
        this._buttonLogin.connect ("clicked", Lang.bind(this, this._checkData));

        // Attach the images and button to the grid
        // Attaching to the Grid: Object, Column, Row, Count Columns, Count Rows
        this._grid.attach (this._header,  0, 0, 2, 1);
        this._grid.attach (this._labelUsername, 0, 1, 1, 1);
        this._grid.attach (this._entryUsername, 1, 1, 1, 1);
        this._grid.attach (this._labelPassword, 0, 2, 1, 1);
        this._grid.attach (this._entryPassword, 1, 2, 1, 1);
        this._grid.attach (this._switchRememberPW, 0, 3, 1, 1);
        this._grid.attach (this._labelRememberPW, 1, 3, 1, 1);
        this._grid.attach (this._buttonLogin, 0, 4, 2, 1);

        // Add the grid to the window
        this._window.add (this._grid);

        // Show the window and all child widgets
        this._window.show_all();
    },

    _checkData: function() {
    	var dm = this.connection.execute_select_command("SELECT type FROM users WHERE username = \""+ this._entryUsername.get_text() + "\" AND password = MD5(\"" + this._entryPassword.get_text() + "\")");
		var iter = dm.create_iter ();
		iter.move_next();
		if (iter.get_value_at(0) == "admin") {
			this._window.destroy();
			this._buildMainWindow();
		} else {
			this._messageDialog = new Gtk.MessageDialog ({
            	modal: true,
            	buttons: Gtk.ButtonsType.OK,
            	message_type: Gtk.MessageType.WARNING,
            	text: "Wait, mate! You're not an admin!"
            });
            this._messageDialog.transient_for = this._window;
            this._messageDialog.connect ('response', Lang.bind(this, this._destroyMessage));
        	this._messageDialog.show();
        	this._entryUsername.text = "";
        	this._entryPassword.text = "";
		}
    },
    
    _buildMainWindow: function() {
    	// Create the application window
        this._window = new Gtk.ApplicationWindow({
            application: this.application,
            window_position: Gtk.WindowPosition.CENTER,
            border_width: 0,
            title: "Main Window - PERSONA",
			default_height: 400,
			default_width: 600
		});
		
		// Create the TreeView
		this._treeView = new Gtk.TreeView ({
			expand: true,
			model: this._listStore
		});
		
		let firstName = new Gtk.TreeViewColumn ({ title: "First Name" });
		let lastName = new Gtk.TreeViewColumn ({ title: "Last Name" });
		let theclass = new Gtk.TreeViewColumn ({ title: "Class" });
		
		let bold = new Gtk.CellRendererText ({
			weight: Pango.Weight.BOLD
		});
		
		let normal = new Gtk.CellRendererText ();
		
		firstName.pack_start (normal, true);
		lastName.pack_start (normal, true);
		theclass.pack_start (bold, true);
		
		firstName.add_attribute (normal, "text", 0);
		lastName.add_attribute (normal, "text", 1);
		theclass.add_attribute (bold, "text", 2);
		
		this._treeView.insert_column (firstName, 0);
		this._treeView.insert_column (lastName, 1);
		this._treeView.insert_column (theclass, 2);
		
		this._label = new Gtk.Label ({ label: "Nothing selected." });
		this.selection = this._treeView.get_selection ();
		this.selection.connect ('changed', Lang.bind (this, this._onSelectionChanged));
		
		// Create the Grid for the Toolbar and the VBox and create the VBox
		this._grid = new Gtk.Grid ({ column_homogeneous: true });
		this._vbox = new Gtk.HBox ();
		
		// Create the Stuff that you need in the VBox
		this._createToolbar();
		
		// Add them to the VBox
		this._vbox.add(this._treeView);
		this._vbox.add(this._label);
		
		// Add Toolbar and VBox to Grid
		this._grid.attach(this._toolbar, 0, 0, 1, 1);
		this._grid.attach(this._vbox, 0, 1, 1, 1);
		
		// Add the Grid to the Window
		this._window.add(this._grid);
		
		// Show the window and all child widgets
        this._window.show_all();
    },
	
	_insertData: function () {
		// Look if all the Fields are not empty
		if (this._firstName_Entry.get_text() == "" || this._lastName_Entry.get_text() == "" || this._theClass_Entry.get_text() == "") {
			return 1;
		}
		
		// Build the SQL Insert Statement with the Statement Builder from GDA
		var nu_builder = new Gda.SqlBuilder ({ stmt_type: Gda.SqlStatementType.INSERT });
		nu_builder.set_table ("demo");
		nu_builder.add_field_value_as_gvalue ("firstName", this._firstName_Entry.get_text() );
		nu_builder.add_field_value_as_gvalue ("lastName", this._lastName_Entry.get_text() );
		nu_builder.add_field_value_as_gvalue ("theClass", this._theClass_Entry.get_text() );
		
		var nu_stmt = nu_builder.get_statement ();
		this.connection.statement_execute_non_select (nu_stmt, null);
		
		this._selectData ();
		return 0;
	},
	
	_buildInsertDialog: function () {
		this._dialog = new Gtk.Dialog ({
			transient_for: this._window,
			modal: true,
			title: "Add a User"
		});
		
		// Get the Content Area of this Dialog
		this._contentArea = this._dialog.get_content_area();
		
		// Create the Labels and the Text Fields for this Dialog
		this._firstName_Label = new Gtk.Label ({ label: "First Name:" });
		this._firstName_Entry = new Gtk.Entry ();
		
		this._lastName_Label = new Gtk.Label ({ label: "Last Name:" });
		this._lastName_Entry = new Gtk.Entry ();
		
		this._theClass_Label = new Gtk.Label ({ label: "Class:" });
		this._theClass_Entry = new Gtk.Entry ();
		
		// Add them to the Content Area
		this._contentArea.add (this._firstName_Label);
		this._contentArea.add (this._firstName_Entry);
		this._contentArea.add (this._lastName_Label);
		this._contentArea.add (this._lastName_Entry);
		this._contentArea.add (this._theClass_Label);
		this._contentArea.add (this._theClass_Entry);
		
		// Get the Action Area of this Dialog
		this._actionArea = this._dialog.get_action_area();
		
		// Create the Add and Cancel Button for this Dialog
		this._addButton = new Gtk.Button.new_from_stock (Gtk.STOCK_ADD);
		this._cancelButton = new Gtk.Button.new_from_stock (Gtk.STOCK_CANCEL);
		
		// Add them to the Action Area
		this._actionArea.add (this._addButton);
		this._actionArea.add (this._cancelButton);
		
		// Connect the OK and Cancel Button to the handler
		this._addButton.connect ("clicked", Lang.bind (this, this._addHandler));
		this._cancelButton.connect ("clicked", Lang.bind (this, this._cancelHandler));
		
		this._dialog.show_all();
	},

	_buildEditDialog: function () {
		let [ isSelected, model, iter ] = this.selection.get_selected();

		this._dialog = new Gtk.Dialog ({
			transient_for: this._window,
			modal: true,
			title: "Edit User " + this._listStore.get_value (iter, 0) + " " + this._listStore.get_value (iter, 1)
		});

		this._oldFirstName = this._listStore.get_value (iter, 0);
		this._oldLastName = this._listStore.get_value (iter, 1);
		this._oldTheClass = this._listStore.get_value (iter, 2);
		
		// Get the Content Area of this Dialog
		this._contentArea = this._dialog.get_content_area();
		
		// Create the Labels and the Text Fields for this Dialog
		this._firstName_Label = new Gtk.Label ({ label: "First Name:" });
		this._firstName_Entry = new Gtk.Entry ();
		this._firstName_Entry.text = this._listStore.get_value (iter, 0);
		
		this._lastName_Label = new Gtk.Label ({ label: "Last Name:" });
		this._lastName_Entry = new Gtk.Entry ();
		this._lastName_Entry.text = this._listStore.get_value (iter, 1)
		
		this._theClass_Label = new Gtk.Label ({ label: "Class:" });
		this._theClass_Entry = new Gtk.Entry ();
		this._theClass_Entry.text = this._listStore.get_value (iter, 2)
		
		// Add them to the Content Area
		this._contentArea.add (this._firstName_Label);
		this._contentArea.add (this._firstName_Entry);
		this._contentArea.add (this._lastName_Label);
		this._contentArea.add (this._lastName_Entry);
		this._contentArea.add (this._theClass_Label);
		this._contentArea.add (this._theClass_Entry);
		
		// Get the Action Area of this Dialog
		this._actionArea = this._dialog.get_action_area();
		
		// Create the Add and Cancel Button for this Dialog
		this._editButton = new Gtk.Button.new_from_stock (Gtk.STOCK_EDIT);
		this._cancelButton = new Gtk.Button.new_from_stock (Gtk.STOCK_CANCEL);
		
		// Add them to the Action Area
		this._actionArea.add (this._editButton);
		this._actionArea.add (this._cancelButton);
		
		// Connect the OK and Cancel Button to the handler
		this._editButton.connect ("clicked", Lang.bind (this, this._editHandler));
		this._cancelButton.connect ("clicked", Lang.bind (this, this._cancelHandler));
		
		this._dialog.show_all();
	},

	_logout: function() {
		this._window.destroy();
		this._buildLoginWindow();
	},
	
	_addHandler: function() {
		var msg = this._insertData();
		if (msg == 1) {
			print ("How I see... It didn't work... (o.0)'\nNot every 'Entry' Field has a Value! (._.)'");
			
			this._errorDialog = new Gtk.MessageDialog ({
            	modal: true,
            	buttons: Gtk.ButtonsType.OK,
            	message_type: Gtk.MessageType.ERROR,
            	text: "How I see... It didn't work...\nNot every 'Entry' Field has a Value!"
            });
            this._errorDialog.connect ('response', Lang.bind(this, this._errorDestroy));
        	this._errorDialog.show();
		}
		if (msg == 0) {
			print ("How I see... It worked! (°o°)/");
			this._dialog.destroy();
			this._openMainWindow();
		}
	},

	_editHandler: function() {
		// Look if all the Fields are not empty
		if (this._firstName_Entry.get_text() == "" || this._lastName_Entry.get_text() == "" || this._theClass_Entry.get_text() == "") {
			print ("How I see... It didn't work... (o.0)'\nNot every 'Entry' Field has a Value! (._.)'");
			
			this._errorDialog = new Gtk.MessageDialog ({
            	modal: true,
            	buttons: Gtk.ButtonsType.OK,
            	message_type: Gtk.MessageType.ERROR,
            	text: "How I see... It didn't work... (o.0)'\nNot every 'Entry' Field has a Value! (._.)'"
            });
            this._errorDialog.connect ('response', Lang.bind(this, this._errorDestroy));
        	this._errorDialog.show();
		} else {
			this.connection.execute_non_select_command ("UPDATE demo SET firstName = \"" + this._firstName_Entry.get_text() + "\", lastName = \"" + this._lastName_Entry.get_text() + "\", theClass = \"" + this._theClass_Entry.get_text() + "\" WHERE firstName = \"" + this._oldFirstName + "\" AND lastName = \"" + this._oldLastName + "\" AND theClass = \"" + this._oldTheClass + "\"", null);
			this._selectData ();
			print ("How I see... It worked! (°o°)/");
			this._dialog.destroy();
			this._openMainWindow();
		}
	},

	_reHandler: function () {
		let [ isSelected, model, iter ] = this.selection.get_selected();

		this._remDialog = new Gtk.MessageDialog ({
            modal: true,
            buttons: Gtk.ButtonsType.YES_NO,
            message_type: Gtk.MessageType.WARNING,
            text: "Do you really want to delete \"" + this._listStore.get_value (iter, 0) + " " + this._listStore.get_value (iter, 1) + "\" from the Database?\nThis cannot be undone!"
        });
        this._remDialog.transient_for = this._window;
        
        var response = this._remDialog.run();
       	if (response == Gtk.ResponseType.YES) {
       		this._remDialog.destroy();

        	this.connection.execute_non_select_command ("DELETE FROM `demo` WHERE firstName = \"" + this._listStore.get_value (iter, 0) + "\"AND lastName = \"" + this._listStore.get_value (iter, 1) + "\" AND theClass = \"" + this._listStore.get_value (iter, 2) + "\"", null);
			this._selectData ();
			print ("How I see... It worked! (°o°)/");
			this._openMainWindow();
		} else if (response == Gtk.ResponseType.NO) {
			this._remDialog.destroy();
		}
    },
	
	_errorDestroy: function () {
		this._errorDialog.destroy();
	},
	
	_cancelHandler: function() {
		this._dialog.destroy();
	},
	
	_destroyMessage: function () {
		this._messageDialog.destroy();
	},
    
    _openMainWindow: function() {
    	this._window.destroy();
    	this._buildMainWindow();
    },
    
    _onSelectionChanged: function() {
    	let [ isSelected, model, iter ] = this.selection.get_selected();
    	this._label.set_label ("Name: " +
    		this._listStore.get_value (iter, 0) + " " +
    		this._listStore.get_value (iter, 1) + "\nClass: " +
    		this._listStore.get_value (iter, 2) + "\nDescription: " +
    		this._listStore.get_value (iter, 3)
    	);
    	this._reButton.set_sensitive(true);
    	this._editButton.set_sensitive(true);
    },
    
    _createToolbar: function() {
    	this._toolbar = new Gtk.Toolbar();
    	this._toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_PRIMARY_TOOLBAR);
    	
        let newAction = new Gio.SimpleAction({ name: 'new'});
        newAction.connect('activate', Lang.bind(this,
            function() {
                this._buildInsertDialog();
            }));
        this.application.add_action(newAction);//note: this action is added to the app

        this._newButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_NEW);
        this._newButton.is_important = true;
        this._toolbar.add(this._newButton);
        this._newButton.show();
        this._newButton.action_name = "app.new";

        let editAction = new Gio.SimpleAction({ name: 'edit'});
        editAction.connect('activate', Lang.bind(this,
            function() {
                this._buildEditDialog();
            }));
        this.application.add_action(editAction);//note: this action is added to the app

        this._editButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_EDIT);
        this._editButton.is_important = false;
        this._toolbar.add(this._editButton);
        this._editButton.show();
        this._editButton.action_name = "app.edit";
        this._editButton.set_sensitive(false);

        let refreshAction = new Gio.SimpleAction({ name: 'refresh'});
        refreshAction.connect('activate', Lang.bind(this,
            function() {
                print("Reloading Main Window...");
                this._window.destroy();
                this._buildMainWindow();
            }));
        this.application.add_action(refreshAction);//note: this action is added to the app

        this._refreshButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_REFRESH);
        this._refreshButton.is_important = false;
        this._toolbar.add(this._refreshButton);
        this._refreshButton.show();
        this._refreshButton.action_name = "app.refresh";

        let reAction = new Gio.SimpleAction({ name: 'remove'});
        reAction.connect('activate', Lang.bind(this,
            function() {
                this._reHandler();
            }));
        this.application.add_action(reAction);//note: this action is added to the app

        this._reButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_REMOVE);
        this._reButton.is_important = false;
        this._toolbar.add(this._reButton);
        this._reButton.show();
        this._reButton.action_name = "app.remove";
        this._reButton.set_sensitive(false);

        let logoutAction = new Gio.SimpleAction({ name: 'logout' });
        logoutAction.connect('activate', Lang.bind(this,
        	function() {
        		this._logout();
        	}
        ));
        this.application.add_action(logoutAction);

        this._logoutButton = new Gtk.ToolButton.new_from_stock(Gtk.STOCK_CANCEL);
        this._logoutButton.is_important = true;
        this._logoutButton.text = "Logout";
        this._toolbar.add(this._logoutButton);
        this._logoutButton.show();
        this._logoutButton.action_name = "app.logout";
    },

	_showAbout: function() {

        // String arrays of the names of the people involved in the project
        var authors = ["蓋橋　春"];
        var documenters = ["春　蓋橋", "ナナミ　蓋橋"];

        // Create the About dialog
        let aboutDialog = new Gtk.AboutDialog({ 
        	title: "PERSONA",
            program_name: "ユーザー管理のためのGTKベースのアプリケーション\nGNOME 3のJavaScriptで作られた。",
            copyright: "コピーライト \xa9 2013 蓋橋 春",
            authors: authors,
            documenters: documenters,
            website: "http://persona.futabashi.jp",
            website_label: "Fake Website..." 
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
let app = new persona ();
app.application.run (ARGV);
