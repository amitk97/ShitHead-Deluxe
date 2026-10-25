"""Mumbai set: Blender (bpy, Cycles CPU) sprite renders.
Run: python3.13 tools/mumbai/render.py <out_dir> [name ...]
Every model is a stylised, bevelled, procedural build lit by a warm key + cool rim; output is a
transparent PNG per model (and per camera). No external assets.
"""
import bpy, math, sys, os
from mathutils import Vector

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mumbai'
ONLY = sys.argv[2:]
os.makedirs(OUT, exist_ok=True)


def reset(res=(768, 768), samples=40, lk=0.5, skyk=0.12, neutral=False):
    LK[0] = lk
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.device = 'CPU'
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; bg = nt.nodes['Background']
    sky = nt.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'MULTIPLE_SCATTERING'; sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(215); sky.sun_disc = False
    nt.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = skyk
    if neutral:
        for l in list(nt.links):
            if l.from_node == sky: nt.links.remove(l)
        bg.inputs['Color'].default_value = (.9, .86, .8, 1); bg.inputs['Strength'].default_value = .6
    bpy.context.scene.view_settings.view_transform = 'Standard'
    return sc


def ground(size=40, z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    g = bpy.context.object; g.is_shadow_catcher = True; return g


def rbox(name, loc, size, m, r=0.1, seg=6, rot=(0, 0, 0)):
    return box(name, loc, size, m, r, rot) if False else _rb(name, loc, size, m, r, seg, rot)


def _rb(name, loc, size, m, r, seg, rot):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    b = o.modifiers.new('b', 'BEVEL'); b.width = r; b.segments = seg; b.limit_method = 'NONE'
    bpy.ops.object.shade_smooth()
    return o


def text(s_, loc, size, m, rot=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    t = bpy.context.object; t.data.body = s_; t.data.size = size; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    t.data.extrude = size * 0.03; t.data.materials.append(m); return t


def mat(name, rgb, rough=0.45, metal=0.0, emit=None, strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x ** 2.2 for x in c)  # sRGB -> linear


def bevel(o, w=0.03, seg=3):
    m = o.modifiers.new('b', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'
    return o


def box(name, loc, size, m, bw=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); bevel(o, bw); return o


def cyl(name, loc, r, h, m, rot=(0, 0, 0), v=32, bw=0.02):
    bpy.ops.mesh.primitive_cylinder_add(location=loc, radius=r, depth=h, vertices=v, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); bevel(o, bw); return o


def sph(name, loc, r, m, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, radius=r, segments=48, ring_count=24)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(m)
    bpy.ops.object.shade_smooth(); return o


def cone(name, loc, r1, r2, h, m, v=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(location=loc, radius1=r1, radius2=r2, depth=h, vertices=v, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


LK = [0.5]
KFRAME = [0]


def light(kind, loc, energy, color=(1, 1, 1), size=3):
    bpy.ops.object.light_add(type=kind, location=loc)
    l = bpy.context.object; l.data.energy = energy * LK[0]; l.data.color = color
    if kind == 'AREA': l.data.size = size
    l.rotation_euler = (Vector((0, 0, 0.8)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return l


def cam(loc, target, ortho=None, lens=60):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.object
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if ortho: c.data.type = 'ORTHO'; c.data.ortho_scale = ortho
    else: c.data.lens = lens
    bpy.context.scene.camera = c; return c


def stage(key=(4, -5, 6), rim=(-5, 3, 4)):
    light('AREA', key, 650, (1.0, 0.92, 0.8), 4)
    light('AREA', rim, 380, (0.65, 0.78, 1.0), 4)
    light('AREA', (0, -6, 1), 120, (1, 1, 1), 5)


def go(name):
    sc = bpy.context.scene
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('rendered', name)


RED, BLUE, WHITE, GOLD, STONE, BLACK = hexc('c8102e'), hexc('012169'), hexc('f4f1ea'), hexc('d9a928'), hexc('c9b98f'), hexc('15151a')


STEEL, SAFFRON, MAR, YEL, STONEY = None, None, None, None, None


def cutblock(name, loc, size, m, cutters, bw=.05):
    """A cube with boolean-cut openings, bevelled afterwards."""
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m)
    for c in cutters:
        md = o.modifiers.new('c', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='c')
        bpy.data.objects.remove(c, do_unlink=True)
    bevel(o, bw, 2); bpy.ops.object.shade_smooth(); return o


def limb(p0, p1, r, m, v=20):
    d = Vector(p1) - Vector(p0)
    bpy.ops.mesh.primitive_cylinder_add(location=(Vector(p0) + Vector(p1)) / 2, radius=r, depth=d.length, vertices=v)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(m)
    bpy.ops.object.shade_smooth(); return o


def gateway():
    reset((1000, 900), 64, 0.6, 0.2)
    st, dark, deep, gold = mat('st', hexc('d3a656'), .8), mat('dk', hexc('8f6428'), .8), mat('dp', hexc('2a1a0c'), .8), mat('go', GOLD, .4, 1)
    ground(40, 0)
    # main block with the great arch cut through it (cylinder top + box below)
    def arch(x, w, h, y0=-3):
        b = bpy.ops.mesh.primitive_cube_add(location=(x, 0, h / 2 - .6)); bo = bpy.context.object; bo.scale = (w / 2, 4, (h - w / 2) / 2); bo.location.z = (h - w / 2) / 2
        bpy.ops.object.transform_apply(scale=True)
        bpy.ops.mesh.primitive_cylinder_add(location=(x, 0, h - w / 2), radius=w / 2, depth=8, vertices=48, rotation=(math.pi / 2, 0, 0)); co = bpy.context.object
        bpy.context.view_layer.objects.active = bo
        md = bo.modifiers.new('u', 'BOOLEAN'); md.operation = 'UNION'; md.object = co; bpy.ops.object.modifier_apply(modifier='u'); bpy.data.objects.remove(co, do_unlink=True)
        return bo
    cutblock('main', (0, 0, 2.7), (7.0, 2.6, 5.4), st, [arch(0, 2.6, 3.9)], .06)
    # side wings with smaller arches
    for sgn in (-1, 1):
        cutblock('wing', (sgn * 4.6, 0, 1.7), (2.6, 2.4, 3.4), st, [arch(sgn * 4.6, 1.15, 2.2)], .05)
        rbox('wingtop', (sgn * 4.6, 0, 3.52), (2.8, 2.6, .24), dark, .06, 3)
        for k in range(5): rbox('cren', (sgn * 4.6 + (k - 2) * .55, -1.2, 3.8), (.3, .22, .36), st, .04, 3)
    # frieze, cornice, parapet
    rbox('cornice', (0, 0, 5.52), (7.3, 2.9, .28), dark, .08, 3)
    for k in range(13): rbox('cren', (-3.3 + k * .55, -1.35, 5.86), (.32, .24, .42), st, .05, 3)
    rbox('band', (0, -1.31, 4.55), (7.1, .06, .16), dark, .02, 2)
    for x in (-2.55, 2.55): rbox('niche', (x, -1.32, 3.1), (.9, .05, 1.8), deep, .2, 4)
    rbox('plinth', (0, -.2, .12), (7.6, 3.1, .24), dark, .06, 3); rbox('step', (0, -1.7, .06), (3.6, .6, .12), dark, .03, 2)
    for k in range(9): rbox('mini', (-2.6 + k * .65, -1.32, 4.95), (.34, .05, .5), deep, .14, 3)
    # four hexagonal turrets with domes
    for x in (-3.0, -1.55, 1.55, 3.0):
        cyl('tur', (x, -.7, 6.6), .52, 1.5, st, (0, 0, math.radians(30)), 6, .03)
        cyl('turband', (x, -.7, 5.98), .53, .16, dark, (0, 0, math.radians(30)), 6, .02)
        cyl('turband', (x, -.7, 7.18), .53, .13, dark, (0, 0, math.radians(30)), 6, .02)
        sph('dome', (x, -.7, 7.32), .58, st, (1, 1, .9)); cone('fin', (x, -.7, 7.95), .06, .01, .45, gold, 8)
        rbox('win', (x, -1.17, 6.55), (.2, .04, .62), deep, .08, 3)
    # inner arch glow so the opening reads as depth
    rbox('floor', (0, -1.3, .02), (2.4, .3, .05), dark, .01, 2)
    light('AREA', (-9, -8, 9), 1500, (1.0, .86, .64), 6); light('AREA', (9, -5, 4), 450, (.75, .85, 1), 7)
    cam((0, -32, 3.6), (0, 0, 3.7), 14.5); go('gateway')


def sealink():
    reset((1400, 700), 56, 0.5, 0.12)
    conc, steel, cable, deckm = mat('cn', hexc('a39f94'), .6), mat('sl', hexc('8c93a0'), .4, .5), mat('cb', hexc('e8dcc0'), .35), mat('dk', hexc('3a3f4c'), .55)
    ground(60, 0)
    L = 11.0
    rbox('deck', (0, 0, 1.0), (2 * L, 1.1, .3), deckm, .05, 3)
    rbox('rail', (0, -.5, 1.28), (2 * L, .05, .22), conc, .01, 2); rbox('rail', (0, .5, 1.28), (2 * L, .05, .22), conc, .01, 2)
    for x in (-7.5, 0.0, 7.5):
        for y in (-.45, .45): rbox('pier', (x, y, .5), (.5, .3, 1.0), conc, .04, 3)
    for x in (-4.2, 4.2):   # two tall towers: two slim legs leaning together, joined near the top
        for y in (-.42, .42):
            limb((x, y * 1.5, .9), (x, y * .35, 7.2), .26, conc)
        rbox('cross', (x, 0, 5.8), (.28, 1.0, .22), conc, .03, 3)
        rbox('crown', (x, 0, 7.3), (.34, .8, .5), conc, .06, 3)
        for s in (-1, 1):
            for k in range(1, 5):
                px = x + s * (.8 + k * .75)
                for y in (-.4, .4): limb((x, y * .5, 6.9 - k * .08), (px, y, 1.1), .045, cable, 8)
    light('AREA', (-4, -12, 12), 1100, (1.0, .9, .75), 8); light('AREA', (9, -4, 6), 400, (.75, .85, 1), 7)
    cam((0, -34, 3.9), (0, 0, 3.9), 20); go('sealink')


def tiffin(part='all'):
    reset((800, 1000), 64, 0.6, 0.3, True)
    steel = mat('st', hexc('b9bfc7'), .3, .8); dark = mat('dk', hexc('7a8089'), .4, .8); blk = mat('k', hexc('1a1a1f'), .6)
    ground(30)
    tiers = [0, 1, 2]
    for i in tiers:
        if part == 'low' and i == 2: continue
        if part == 'top' and i < 2: continue
        z = .45 + i * .78
        cyl('tier', (0, 0, z), 1.0, .66, steel, (0, 0, 0), 64, .03)
        cyl('rim', (0, 0, z + .3), 1.04, .07, dark, (0, 0, 0), 64, .015)
        cyl('rimb', (0, 0, z - .3), 1.04, .07, dark, (0, 0, 0), 64, .015)
        for a in (0, 2.0944, 4.18879):
            pass
        for k in range(3): cyl('rib', (0, 0, z - .1 + k * .1), 1.012, .015, dark, (0, 0, 0), 64, .003)
    if part in ('all', 'top'):
        sph('knob', (0, 0, .45 + 2 * .78 + .33), .16, steel, (1, 1, .8))
        cyl('lid', (0, 0, .45 + 2 * .78 + .3), .98, .06, dark, (0, 0, 0), 64, .01)
    if part in ('all', 'low'):
        # clamp bar down the front + the carry handle from the base to the top
        rbox('bar', (0, -1.02, 1.1), (.12, .06, 1.9), dark, .02, 2)
        rbox('base', (0, 0, .08), (2.2, 2.2, .1), dark, .03, 3) if False else None
    if part in ('all', 'top'):
        limb((-1.03, 0, .5), (-.7, 0, 3.1), .05, dark, 12); limb((1.03, 0, .5), (.7, 0, 3.1), .05, dark, 12)   # the carry handle lifts with the lid
        limb((-.7, 0, 3.1), (.7, 0, 3.1), .05, dark, 12)
        sph('hn', (0, 0, 3.12), .1, dark)
    light('AREA', (4, -6, 7), 800, (1.0, .92, .8), 5); light('AREA', (-5, 2, 4), 380, (.7, .8, 1), 5); light('AREA', (0, -6, 1), 200, (1, 1, 1), 5)
    cam((0, -12, 2.1), (0, 0, 1.75), 4.6); go('tiffin_' + part)


def dabba():
    reset((768, 768), 64, 0.5, 0.14)
    white, skin, blk, gold, steel, dark = mat('wh', hexc('f1eee4'), .6), mat('sk', hexc('b9805a'), .5), mat('k', hexc('15151a'), .55), mat('go', GOLD, .3, 1), mat('st', hexc('c6ccd4'), .28, .85), mat('dk', hexc('6f757d'), .35, .85)
    br, tan, brown = mat('br', hexc('2a1d14'), .7), mat('tn', hexc('e9dcc2'), .6), mat('bw', hexc('7a4a2a'), .6)
    ground(20, -1.3)
    sph('torso', (0, 0, .3), 1.0, white, (1.2, .78, 1.0))
    sph('shL', (-1.05, 0, .6), .5, white); sph('shR', (1.05, 0, .6), .5, white)
    rbox('placket', (0, -.77, .4), (.22, .06, 1.5), tan, .03, 3)
    for z in (.85, .45, .05): sph('btn', (0, -.82, z), .05, gold)
    rbox('collar', (0, -.05, 1.0), (.82, .6, .24), white, .1, 4)
    cyl('neck', (0, 0, 1.0), .32, .4, skin, (0, 0, 0), 24, .02)
    sph('head', (0, -.02, 1.68), .62, skin, (.9, .86, 1.0))
    for x in (-.21, .21):
        sph('eyew', (x, -.52, 1.78), .1, white, (1, .5, 1.2)); sph('pupil', (x, -.58, 1.78), .055, blk)
        rbox('brow', (x, -.55, 1.94), (.22, .05, .05), br, .02, 2)
    sph('nose', (0, -.6, 1.62), .09, skin, (1, 1.2, 1))
    rbox('moust', (0, -.58, 1.49), (.46, .07, .09), br, .04, 3)
    sph('smile', (0, -.57, 1.38), .09, mat('lp', hexc('9a4a3e'), .6), (2.2, .5, .7))
    for x in (-1, 1): sph('ear', (x * .56, -.02, 1.68), .12, skin, (.5, 1, 1.2))
    # white Gandhi cap, boat shaped, with a stack of tiffin tiers balanced on it
    rbox('topi', (0, -.02, 2.14), (1.55, 1.0, .46), white, .2, 6, (0, 0, 0))
    rbox('topiband', (0, -.02, 1.96), (1.54, 1.01, .14), tan, .05, 3)
    for i in range(3):
        z = 2.62 + i * .46
        cyl('tier', (0, -.02, z), .56, .44, steel, (0, 0, 0), 48, .02); cyl('rim', (0, -.02, z + .22), .59, .05, dark, (0, 0, 0), 48, .01)
    sph('knob', (0, -.02, 4.2), .1, steel, (1, 1, .8))
    limb((-.5, -.02, 2.5), (-.4, -.02, 3.95), .03, dark, 10); limb((.5, -.02, 2.5), (.4, -.02, 3.95), .03, dark, 10)
    # arms at his sides
    limb((-1.05, 0, .55), (-1.2, -.04, -.5), .27, white); sph('handL', (-1.22, -.05, -.7), .2, skin)
    limb((1.05, 0, .55), (1.2, -.04, -.5), .27, white); sph('handR', (1.22, -.05, -.7), .2, skin)
    light('AREA', (4, -6, 6), 700, (1.0, .93, .82), 5); light('AREA', (-5, 3, 4), 300, (.7, .8, 1), 5)
    cam((0, -10.5, 2.45), (0, 0, 1.85), None, 62); go('dabba')


def marigold(name='marigold', c1='ff9a00', c2='e45c00', c3='ffd23a'):
    reset((700, 700), 48, 0.5, 0.14)
    a, b, c = mat('a', hexc(c1), .55), mat('b', hexc(c2), .6), mat('c', hexc(c3), .55)
    leaf = mat('lf', hexc('2f7d3a'), .6)
    ground(10, -.2)
    for k in range(8): sph('leaf', (math.cos(k * .785) * 2.5, math.sin(k * .785) * 2.5, -.05), .9, leaf, (1.4, .45, .1)).rotation_euler = (0, 0, k * .785)
    layers = [(2.15, 26, .22, .62, 0.0, b), (1.75, 24, .2, .55, .13, a), (1.35, 20, .19, .5, .27, b), (1.0, 16, .17, .44, .4, a), (.65, 12, .15, .36, .52, c), (.3, 8, .12, .28, .62, a)]
    for li, (r, n, w, l, z, m) in enumerate(layers):
        for k in range(n):
            ang = k * math.pi * 2 / n + li * .31
            p = sph('petal', (math.cos(ang) * r, math.sin(ang) * r, z), l, m, (1.0, w / l * 1.5, .22)); p.rotation_euler = (0, 0, ang)
    sph('core', (0, 0, .75), .28, c, (1, 1, .7))
    light('AREA', (3, -4, 9), 600, (1.0, .95, .85), 6); light('AREA', (-4, 3, 5), 200, (.8, .9, 1), 6)
    cam((0, 0, 12), (0, 0, 0), 6.0); go(name)


MODELS = dict(gateway=gateway, sealink=sealink, tiffin_all=lambda: tiffin('all'), tiffin_low=lambda: tiffin('low'), tiffin_top=lambda: tiffin('top'),
              dabba=dabba, marigold=marigold, marigold_y=lambda: marigold('marigold_y', 'ffc400', 'f29a00', 'fff0a0'))
for n, f in MODELS.items():
    if not ONLY or n in ONLY: f()
