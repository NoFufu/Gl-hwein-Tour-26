import bpy, math, sys, os
from mathutils import Vector
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
OUT = args[0] if args else 'test.png'
FRAMES = int(args[1]) if len(args)>1 else 1
SAMPLES = int(args[2]) if len(args)>2 else 64
RES = int(args[3]) if len(args)>3 else 460
START = int(args[4]) if len(args)>4 else 0
HERE = os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name): m = bpy.data.materials.new(name); m.use_nodes = True; return m
def nodes(m): return m.node_tree.nodes, m.node_tree.links

# ---------- Materialien ----------
# Körper: tiefrote Glasur mit Klarlack, goldener Rand oben, unglasierter Fuß, Gold-Aufdruck
body = mat('glaze'); N, L = nodes(body); N.clear()
out = N.new('ShaderNodeOutputMaterial')
glaze = N.new('ShaderNodeBsdfPrincipled')
glaze.inputs['Base Color'].default_value = (0.11, 0.003, 0.016, 1)
glaze.inputs['Roughness'].default_value = 0.16
glaze.inputs['Coat Weight'].default_value = 1.0
glaze.inputs['Coat Roughness'].default_value = 0.035
glaze.inputs['Specular IOR Level'].default_value = 0.5
gold = N.new('ShaderNodeBsdfPrincipled')
gold.inputs['Base Color'].default_value = (0.92, 0.62, 0.28, 1)
gold.inputs['Metallic'].default_value = 1.0
gold.inputs['Roughness'].default_value = 0.17
print_ = N.new('ShaderNodeBsdfPrincipled')
print_.inputs['Base Color'].default_value = (0.86, 0.6, 0.3, 1)
print_.inputs['Metallic'].default_value = 0.45
print_.inputs['Roughness'].default_value = 0.32
bisque = N.new('ShaderNodeBsdfPrincipled')
bisque.inputs['Base Color'].default_value = (0.62, 0.50, 0.40, 1)
bisque.inputs['Roughness'].default_value = 0.85
tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
# Winkel um die Achse -> U, Höhe -> V (zylindrische Abbildung für den Aufdruck)
negy = N.new('ShaderNodeMath'); negy.operation='MULTIPLY'; negy.inputs[1].default_value=-1; L.new(sep.outputs['Y'], negy.inputs[0])
at = N.new('ShaderNodeMath'); at.operation = 'ARCTAN2'; L.new(sep.outputs['X'], at.inputs[0]); L.new(negy.outputs[0], at.inputs[1])
u = N.new('ShaderNodeMapRange'); u.inputs['From Min'].default_value = -math.pi-math.radians(18); u.inputs['From Max'].default_value = math.pi-math.radians(18); L.new(at.outputs[0], u.inputs['Value'])
v = N.new('ShaderNodeMapRange'); v.inputs['From Min'].default_value = -0.52; v.inputs['From Max'].default_value = 0.6; L.new(sep.outputs['Z'], v.inputs['Value'])
comb = N.new('ShaderNodeCombineXYZ'); L.new(u.outputs[0], comb.inputs['X']); L.new(v.outputs[0], comb.inputs['Y'])
img = N.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(os.path.join(HERE, 'label.png')); img.image.colorspace_settings.name = 'Non-Color'; img.extension = 'CLIP'; img.interpolation = 'Cubic'
L.new(comb.outputs[0], img.inputs['Vector'])
# Aufdruck nur außen: Normale zeigt nach außen
geo = N.new('ShaderNodeNewGeometry'); 
dot = N.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; L.new(geo.outputs['Normal'], dot.inputs[0])
radial = N.new('ShaderNodeCombineXYZ'); L.new(sep.outputs['X'], radial.inputs['X']); L.new(sep.outputs['Y'], radial.inputs['Y'])
norm = N.new('ShaderNodeVectorTransform'); norm.vector_type='VECTOR'; norm.convert_from='OBJECT'; norm.convert_to='WORLD'; L.new(radial.outputs[0], norm.inputs[0])
L.new(norm.outputs[0], dot.inputs[1])
outside = N.new('ShaderNodeMath'); outside.operation = 'GREATER_THAN'; outside.inputs[1].default_value = 0.0; L.new(dot.outputs['Value'], outside.inputs[0])
printf = N.new('ShaderNodeMath'); printf.operation = 'MULTIPLY'; L.new(img.outputs['Color'], printf.inputs[0]); L.new(outside.outputs[0], printf.inputs[1])
m1 = N.new('ShaderNodeMixShader'); L.new(printf.outputs[0], m1.inputs[0]); L.new(glaze.outputs[0], m1.inputs[1]); L.new(print_.outputs[0], m1.inputs[2])
# goldener Rand oben
rim = N.new('ShaderNodeMapRange'); rim.inputs['From Min'].default_value = 0.668; rim.inputs['From Max'].default_value = 0.672; L.new(sep.outputs['Z'], rim.inputs['Value'])
m2 = N.new('ShaderNodeMixShader'); L.new(rim.outputs[0], m2.inputs[0]); L.new(m1.outputs[0], m2.inputs[1]); L.new(gold.outputs[0], m2.inputs[2])
foot = N.new('ShaderNodeMapRange'); foot.inputs['From Min'].default_value = -0.745; foot.inputs['From Max'].default_value = -0.74; L.new(sep.outputs['Z'], foot.inputs['Value'])
m3 = N.new('ShaderNodeMixShader'); L.new(foot.outputs[0], m3.inputs[0]); L.new(bisque.outputs[0], m3.inputs[1]); L.new(m2.outputs[0], m3.inputs[2])
L.new(m3.outputs[0], out.inputs['Surface'])
# ganz leichte Unebenheit der Glasur (handgemacht)
noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 6; L.new(tc.outputs['Object'], noise.inputs['Vector'])
bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.025; L.new(noise.outputs['Fac'], bump.inputs['Height'])
for s in (glaze, gold): L.new(bump.outputs['Normal'], s.inputs['Normal'])

def simple(name, color, rough=0.5, metal=0.0, coat=0.0):
    m = mat(name); b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat
    return m

# ---------- Geometrie ----------
root = bpy.data.objects.new('mug', None); sc.collection.objects.link(root)
def link(o): sc.collection.objects.link(o); o.parent = root; return o

prof = [(0,-.735),(.44,-.735),(.5,-.75),(.53,-.78),(.62,-.78),(.67,-.765),(.715,-.7),(.745,-.55),(.765,-.2),(.785,.2),(.8,.55),(.805,.64),
        (.8,.69),(.785,.705),(.765,.703),(.75,.685),(.742,.6),(.73,.2),(.71,-.25),(.67,-.53),(.58,-.62),(.4,-.645),(0,-.65)]
me = bpy.data.meshes.new('body'); me.from_pydata([(x,0,z) for x,z in prof], [(i,i+1) for i in range(len(prof)-1)], []); 
bodyo = link(bpy.data.objects.new('body', me))
scr = bodyo.modifiers.new('screw','SCREW'); scr.axis='Z'; scr.steps=128; scr.render_steps=128; scr.use_merge_vertices=True; scr.use_smooth_shade=True
ss = bodyo.modifiers.new('sub','SUBSURF'); ss.levels=2; ss.render_levels=2
bodyo.data.materials.append(body)

# Henkel: gebogene Röhre mit ovalem Querschnitt
cu = bpy.data.curves.new('handle','CURVE'); cu.dimensions='3D'; sp = cu.splines.new('BEZIER')
pts = [(.7,.46),(1.22,.44),(1.4,.04),(1.2,-.36),(.72,-.42)]
sp.bezier_points.add(len(pts)-1)
for bp,(x,z) in zip(sp.bezier_points, pts): bp.co=(x,0,z); bp.handle_left_type=bp.handle_right_type='AUTO'
cu.bevel_mode='ROUND'; cu.bevel_depth=.105; cu.bevel_resolution=8; cu.resolution_u=24; cu.use_fill_caps=True
# dicker an den Ansätzen, schlanker im Bogen
for bp,r in zip(sp.bezier_points,[1.25,.95,.9,.95,1.25]): bp.radius=r
ho = link(bpy.data.objects.new('handle', cu)); ho.scale=(1,.78,1); ho.data.materials.append(body)

# Getränk mit leichter Wölbung zum Rand (Meniskus)
wine = mat('wine'); N2,L2 = nodes(wine); b = N2['Principled BSDF']
b.inputs['Base Color'].default_value=(.06,.002,.008,1); b.inputs['Roughness'].default_value=.04; b.inputs['Coat Weight'].default_value=.6
bpy.ops.mesh.primitive_circle_add(vertices=128, radius=.742, fill_type='TRIFAN', location=(0,0,.56))
liq = bpy.context.object; liq.parent = root; liq.data.materials.append(wine)
for vx in liq.data.vertices:
    r = Vector((vx.co.x,vx.co.y)).length; vx.co.z += max(0,(r-.68))*.25
for p in liq.data.polygons: p.use_smooth=True

# Orangenscheibe
om = mat('orange'); N3,L3 = nodes(om); b3 = N3['Principled BSDF']
oi = N3.new('ShaderNodeTexImage'); oi.image = bpy.data.images.load(os.path.join(HERE,'orange.png')); L3.new(oi.outputs['Color'], b3.inputs['Base Color'])
b3.inputs['Roughness'].default_value=.35; b3.inputs['Subsurface Weight'].default_value=.4; b3.inputs['Subsurface Radius'].default_value=(.1,.05,.02)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.2, depth=.03, location=(.26,-.12,.575), rotation=(math.radians(4),math.radians(-6),0))
orn = bpy.context.object; orn.parent=root; orn.data.materials.append(om)
# Zimtstange, an den Rand gelehnt
cin = simple('cinnamon',(.28,.11,.04),.75)
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.04, depth=.78, location=(-.2,.22,.78), rotation=(math.radians(-38),math.radians(-28),0))
cs = bpy.context.object; cs.parent=root; cs.data.materials.append(cin); bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=.036, depth=.78, location=(-.15,.25,.79), rotation=(math.radians(-38),math.radians(-28),0))
cs2 = bpy.context.object; cs2.parent=root; cs2.data.materials.append(cin); bpy.ops.object.shade_smooth()
# Sternanis
an = simple('anise',(.22,.09,.04),.6)
for i in range(8):
    a = i*math.pi/4
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.05, location=(-.12+math.cos(a)*.07, -.28+math.sin(a)*.07, .58))
    s = bpy.context.object; s.scale=(1.6,.75,.55); s.rotation_euler=(0,0,a); s.parent=root; s.data.materials.append(an); bpy.ops.object.shade_smooth()

root.rotation_euler = (0,0,math.radians(18))

# ---------- Licht, Kamera, Boden ----------
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes=True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value=(.07,.062,.06,1); bg.inputs['Strength'].default_value=1
def area(name, loc, size, energy, color=(1,1,1), sx=None):
    l = bpy.data.lights.new(name,'AREA'); l.energy=energy; l.color=color; l.shape='RECTANGLE'; l.size=size; l.size_y=sx or size
    o = bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    d = (Vector((0,0,0))-Vector(loc)).to_track_quat('-Z','Y'); o.rotation_euler=d.to_euler(); return o
area('key', (-3.4,-2.4,2.6), .55, 420, (1,.94,.86), 3.4)
area('soft', (-1.5,-4.5,3.5), 3.0, 60, (1,.96,.92))   # hohe Softbox links: langer Lichtstreifen auf der Glasur
area('rim', (3.0,2.4,2.2), .8, 260, (1,.85,.78), 2.6)       # Kante rechts hinten
area('fill', (2.4,-3.6,.4), 1.0, 30, (.9,.92,1))            # sanfte Aufhellung vorne
area('top', (0,0,4.5), 2.0, 70)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0,0,-.78)); fl=bpy.context.object; fl.is_shadow_catcher=True; fl.data.materials.append(simple('floor',(.012,.012,.014),.6))
cam = bpy.data.cameras.new('cam'); cam.sensor_fit='VERTICAL'; cam.angle=math.radians(26)
co = bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(0,-7.6,2.1); co.rotation_euler=(Vector((0.12,0,.12))-co.location).to_track_quat('-Z','Y').to_euler()

sc.render.engine='CYCLES'; sc.cycles.samples=SAMPLES; sc.cycles.use_denoising=True
sc.cycles.device='CPU'; sc.render.film_transparent=True
sc.render.resolution_x=RES; sc.render.resolution_y=int(RES*260/230); sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Medium High Contrast'
sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
sc.cycles.max_bounces=8; sc.cycles.glossy_bounces=4; sc.cycles.transparent_max_bounces=4
for i in range(START, FRAMES):
    root.rotation_euler.z = math.radians(18) + i*2*math.pi/FRAMES
    sc.render.filepath = OUT if FRAMES==1 else OUT.replace('#', f'{i:02d}')
    bpy.ops.render.render(write_still=True)
print('done')
