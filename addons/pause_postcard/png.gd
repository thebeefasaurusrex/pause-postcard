extends RefCounted

static func with_metadata(png: PackedByteArray, details: Dictionary) -> PackedByteArray:
	var raw := JSON.stringify(details)
	var ascii := ""
	for i in raw.length():
		var u := raw.unicode_at(i)
		if u >= 32 and u <= 126:
			ascii += raw[i]
		elif u <= 0xffff:
			ascii += "\\u%04x" % u
		else:
			u -= 0x10000
			ascii += "\\u%04x\\u%04x" % [0xd800 | (u >> 10), 0xdc00 | (u & 1023)]
	var data := "tEXtpausepostcard".to_ascii_buffer()
	data.append(0)
	data.append_array(ascii.to_ascii_buffer())
	var crc := 0xffffffff
	for b in data:
		crc ^= b
		for n in 8:
			crc = (crc >> 1) ^ (0xedb88320 if crc & 1 else 0)
	var out := png.slice(0, png.size()-12)
	out.append_array(be32(data.size()-4))
	out.append_array(data)
	out.append_array(be32(crc ^ 0xffffffff))
	out.append_array(png.slice(png.size()-12))
	return out

static func be32(n: int) -> PackedByteArray:
	return PackedByteArray([(n>>24)&255,(n>>16)&255,(n>>8)&255,n&255])
