extends Node
## Autoload as PausePostcard. Call configure() and set_where() from the game.

signal desktop_preview_ready(save_button: Button, report_code: String)

const Frame := preload("frame.gd")
const Png := preload("png.gd")
const ALPHABET := "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
var game := ""
var code := ""
var title := ""
var build := ""
var where := ""
var busy := false
var popup: Window
var feedback_url := ""

func configure(game_id: String, game_code: String, game_name: String, build_name: String) -> void:
	game = game_id.left(80)
	var valid_code := RegEx.new()
	valid_code.compile("^[A-Z0-9]{1,12}$")
	code = game_code if valid_code.search(game_code) != null else "GAME"
	title = game_name.left(80)
	build = build_name.left(64)

func set_where(location: String) -> void:
	where = location.left(120)

func capture() -> void:
	if busy or popup or game.is_empty() or DisplayServer.get_name() == "headless":
		return
	busy = true
	await RenderingServer.frame_post_draw
	var source := get_viewport().get_texture().get_image()
	if source == null or source.is_empty():
		busy = false
		push_warning("PausePostcard could not read the game picture.")
		return
	var meta := metadata(source.get_size())
	var image := await Frame.render(self,source,meta,title)
	var png := Png.with_metadata(image.save_png_to_buffer(),meta)
	if OS.has_feature("web"):
		var bridge := JavaScriptBridge.get_interface("window")
		if bridge.get("ssGodotSnap") != null:
			bridge.ssGodotSnap(Marshalls.raw_to_base64(png))
		else:
			push_warning("Install the PausePostcard bridge in the Web export shell.")
	else:
		show_preview(image,png,meta)
	busy = false

func metadata(size: Vector2i) -> Dictionary:
	var report := code+"-"
	for byte in Crypto.new().generate_random_bytes(4):
		report += ALPHABET[byte & 31]
	return {"game":game,"build":build,"platform":OS.get_name(),"resolution":[size.x,size.y],
		"where":where,"reportCode":report,"utc":Time.get_datetime_string_from_system(true)+".000Z"}

func save_png(bytes: PackedByteArray, report: String) -> String:
	var pictures := OS.get_system_dir(OS.SYSTEM_DIR_PICTURES)
	if pictures.is_empty():
		return ""
	var path := pictures.path_join("PausePostcard").path_join(code)
	if DirAccess.make_dir_recursive_absolute(path) != OK:
		return ""
	var file := FileAccess.open(path.path_join(report+".png"),FileAccess.WRITE)
	if file == null:
		return ""
	file.store_buffer(bytes)
	var result := file.get_error()
	file.close()
	return path.path_join(report+".png") if result == OK else ""

func show_preview(image: Image, png: PackedByteArray, meta: Dictionary) -> void:
	popup = Window.new()
	popup.title = "PausePostcard " + meta.reportCode
	popup.size = Vector2i(720, 520)
	popup.min_size = Vector2i(480, 330)
	popup.transient = true
	popup.exclusive = true
	add_child(popup)
	var body := VBoxContainer.new()
	popup.add_child(body)
	body.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 12)
	var picture := TextureRect.new()
	picture.texture = ImageTexture.create_from_image(image)
	picture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(picture)
	var actions := HBoxContainer.new()
	body.add_child(actions)
	var status := Label.new()
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(status)
	var close := func():
		popup.queue_free()
		popup = null
	popup.close_requested.connect(close)
	var save_button := add_button(actions,"Save",func():
		var path := save_png(png,meta.reportCode)
		status.text = "Saved " + path if not path.is_empty() else "Could not write to Pictures."
	)
	if feedback_url.begins_with("https://"):
		add_button(actions,"Tell us about it",func():
			var path := save_png(png,meta.reportCode)
			if path.is_empty():
				status.text = "Could not write to Pictures."
				return
			status.text = "Attach this file in the browser: " + path
			var url := "%s?game=%s&build=%s&where=%s&code=%s" % [feedback_url,game.uri_encode(),build.uri_encode(),where.uri_encode(),str(meta.reportCode).uri_encode()]
			if OS.shell_open(url) != OK:
				status.text += "\nOpen " + feedback_url + " to send the PausePostcard."
		)
	add_button(actions,"Close",close)
	popup.popup_centered()
	save_button.grab_focus()
	desktop_preview_ready.emit(save_button, meta.reportCode)

func add_button(parent: Node, label: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = label
	b.pressed.connect(action)
	parent.add_child(b)
	return b
