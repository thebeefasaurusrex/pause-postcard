extends Node2D

const INK := Color("#0a0f24")
const PAPER := Color("#eef1e0")
const PHOS := Color("#baf86b")
const MUTED := Color("#a3b0d8")
const STAMP := Color("#ff6f52")
@onready var DisplayFace: Font = load("res://addons/pause_postcard/fonts/anybody.ttf")
@onready var MonoFace: Font = load("res://addons/pause_postcard/fonts/martianmono.ttf")
@onready var SiteFace: Font = load("res://addons/pause_postcard/fonts/instrumentsans.ttf")

var shot: ImageTexture
var meta: Dictionary
var game_name: String
var picture: Vector2i
var side: int
var band: int
var edge: int

static func render(owner_node: Node, source: Image, details: Dictionary, title: String, pixel: bool = false) -> Image:
	var w := source.get_width()
	var scale := maxi(1, ceili(960.0 / w)) if pixel else 1
	if scale > 1:
		source = source.duplicate()
		source.resize(w * scale, source.get_height() * scale, Image.INTERPOLATE_NEAREST)
	var frame: Node2D = load("res://addons/pause_postcard/frame.gd").new()
	frame.shot = ImageTexture.create_from_image(source)
	frame.meta = details
	frame.game_name = title
	frame.picture = source.get_size()
	frame.side = roundi(.02 * frame.picture.x)
	frame.band = roundi(.072 * frame.picture.x)
	frame.edge = maxi(1, roundi(.0023 * frame.picture.x))
	var target := SubViewport.new()
	target.size = frame.picture + Vector2i(frame.side * 2, frame.band * 2)
	target.disable_3d = true
	target.render_target_update_mode = SubViewport.UPDATE_ONCE
	target.add_child(frame)
	owner_node.add_child(target)
	await RenderingServer.frame_post_draw
	var output := target.get_texture().get_image()
	target.queue_free()
	return output

func write(value: String, x: float, y: float, px: float, face: Font, weight: int,
		color: Color, limit: float, align: int = HORIZONTAL_ALIGNMENT_LEFT) -> void:
	var style := FontVariation.new()
	style.base_font = face
	style.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): weight}
	var size := maxi(1, roundi(px * picture.x / 1280.0))
	var width := style.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	if width > limit:
		while not value.is_empty() and style.get_string_size(value + "…", HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > limit:
			value = value.left(-1)
		value += "…"
		width = style.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	var start := x - width if align == HORIZONTAL_ALIGNMENT_RIGHT else (x - width / 2 if align == HORIZONTAL_ALIGNMENT_CENTER else x)
	draw_string(style, Vector2(start, y), value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)

func _draw() -> void:
	var w := float(picture.x)
	var h := float(picture.y)
	var right := side + w
	var bottom := band + h
	var k := w / 1280.0
	draw_rect(Rect2(0, 0, w + side * 2, h + band * 2), INK)
	draw_rect(Rect2(side - edge, band - edge, w + edge * 2, h + edge * 2), PAPER)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	draw_texture(shot, Vector2(side, band))
	write(game_name.to_upper(), side, 44*k, 37, DisplayFace, 800, PAPER, w*.74)
	write("build %s · %s" % [meta.build, meta.platform], side, 70*k, 17, MonoFace, 500, PHOS, w*.74)
	write("PausePostcard", side, bottom+38*k, 27, SiteFace, 700, PHOS, w*.46)
	write("Screenshot captured during play", side, bottom+65*k, 14, MonoFace, 500, MUTED, w*.48)
	write(meta.where if meta.where else "Where: add it in your report", right, bottom+36*k, 17, MonoFace, 500, PAPER, w*.49, HORIZONTAL_ALIGNMENT_RIGHT)
	write(meta.utc.left(16).replace("T"," ")+" UTC · Report code "+meta.reportCode, right, bottom+65*k, 14, MonoFace, 500, MUTED, w*.49, HORIZONTAL_ALIGNMENT_RIGHT)
	draw_set_transform(Vector2(right-124*k,45*k), deg_to_rad(-4), Vector2.ONE)
	var points := PackedVector2Array()
	for corner in [[108,-25,-90],[108,25,0],[-108,25,90],[-108,-25,180]]:
		for i in range(9):
			var angle := deg_to_rad(float(corner[2]) + i * 11.25)
			points.append((Vector2(corner[0],corner[1])+Vector2.from_angle(angle)*8)*k)
	points.append(points[0])
	draw_polyline(points, STAMP, 3*k, true)
	write("POSTCARD", 0, -1*k, 31, DisplayFace, 800, STAMP, 220*k, HORIZONTAL_ALIGNMENT_CENTER)
	write("GAME CAPTURE", 0, 21*k, 14, MonoFace, 500, STAMP, 220*k, HORIZONTAL_ALIGNMENT_CENTER)
	draw_set_transform(Vector2.ZERO)
