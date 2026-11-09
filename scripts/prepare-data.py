"""Build a versioned, auditable design catalogue from the supplied CSV corpus.
No embeddings or network calls: this is an explicit editorial taxonomy organised by the
questions a game designer asks (verbs, decisions, systems, structure, feeling, audience...).
"""
import csv,json,collections,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=ROOT/'data/source'
EDITORIAL=ROOT/'data/editorial'
FILES=['steam429_tags_ranked.csv','precision_platformer_203_catalog.csv','steam203_mechanics_500_fusions.csv','precision_platformer_45_concepts.csv']
for name in FILES:
    target=SOURCES/name
    if not target.exists():
        source=ROOT.parent/name
        if not source.exists(): raise FileNotFoundError(f'Missing input: {target}')
        shutil.copyfile(source,target)
def read(name): return list(csv.DictReader((SOURCES/name).open(encoding='utf-8-sig')))
PLAY_KEYS=['agon','alea','mimicry','ilinx']
def read_notes(name):
    """Pipe-separated editorial notes: key|play digits|summary|works separated by ' / '."""
    notes={}
    for n,line in enumerate((EDITORIAL/name).read_text(encoding='utf-8').splitlines(),1):
        if not line.strip() or line.startswith('#'): continue
        parts=line.split('|')
        if len(parts)!=4: raise ValueError(f'{name}:{n}: expected 4 columns')
        key,play,summary,works=(p.strip() for p in parts)
        if key in notes: raise ValueError(f'{name}:{n}: duplicate {key}')
        if len(play)!=4 or any(c not in '0123' for c in play): raise ValueError(f'{name}:{n}: play must be four digits 0-3')
        if not summary: raise ValueError(f'{name}:{n}: empty summary')
        notes[key]=dict(play={k:int(v) for k,v in zip(PLAY_KEYS,play)},summary=summary,examples=[w.strip() for w in works.split(' / ') if w.strip()])
    return notes
# Clusters answer one design question each. Every tag is placed exactly once (primary);
# secondary facets are listed separately and never invent new Steam tags.
spec=[
('action','操作・アクション','Action','move','#635bda','瞬間ごとに、プレイヤーは何をする？','秒単位で繰り返す操作＝コアの動詞。跳ぶ・撃つ・斬る・操縦する。手ざわりと上達の土台になる層。',[
('jump','跳ぶ・走る','Platformer|2D Platformer|3D Platformer|Precision Platformer|Parkour|Runner'),
('shoot','撃つ・狙う','Shooter|FPS|Top-Down Shooter|Third-Person Shooter|Arena Shooter|Hero Shooter|Boomer Shooter|Extraction Shooter|Twin Stick Shooter|Shoot \'Em Up|Looter Shooter|On-Rails Shooter|Bullet Hell|Sniper|Archery'),
('melee','斬る・格闘','Action|Combat|Hack and Slash|Swordplay|Character Action Game|Spectacle fighter|Beat \'em up|Musou|Fighting|2D Fighter|3D Fighter|Martial Arts|Boxing|Wrestling'),
('ride','乗り物・操縦','Racing|Driving|Combat Racing|Vehicular Combat|Flight|6DOF|Motorbike|Bikes|Motocross|Offroad|ATV|BMX|Cycling|Skateboarding|Skating|Skiing|Snowboarding|Sailing'),
('sports','スポーツ・競技','Sports|Golf|Mini Golf|Football (Soccer)|Football (American)|Basketball|Baseball|Billiards|Tennis|Hockey|Bowling|Volleyball|Cricket|Rugby|Pinball'),
('feel','手ざわり・タイミング','Physics|Intentionally Awkward Controls|Rhythm|Quick-Time Events|Fast-Paced|Bullet Time|Destruction'),
('sneak','忍ぶ・盗む','Stealth|Heist')]),
('strategy','戦略・戦術','Strategy','flag','#cc7359','どんな計画と読み合いをさせる？','時間をかけた意思決定。配置・順序・資源配分で相手やシステムを上回る層。',[
('tactics','戦術・部隊','Tactical|Turn-Based Tactics|Real Time Tactics|Strategy RPG|Tactical RPG|Turn-Based Combat|Hex Grid|Grid-Based Movement|Wargame'),
('grand','戦略・大局','Strategy|Turn-Based Strategy|RTS|Action RTS|Grand Strategy|4X|Diplomacy'),
('defense','防衛・自動戦闘','Tower Defense|Auto Battler|MOBA'),
('tabletop','卓上・カード・賭け','Card Game|Card Battler|Trading Card Game|Deckbuilding|Roguelike Deckbuilder|Board Game|Tabletop|Chess|Dice|Poker|Gambling|Mahjong|Solitaire')]),
('puzzle','謎・思考','Puzzle','puzzle','#517fa7','何を考え、解き明かさせる？','答えのある問題を解く・推理する・知識を使う層。理解した瞬間の「わかった！」を設計する。',[
('logic','論理・配置','Puzzle|Logic|Sokoban|Lemmings|Match 3|Falling Blocks|Organizing|Puzzle Platformer|Programming'),
('deduce','推理・調査','Mystery|Detective|Investigation|Hidden Object|Escape Room|Hacking'),
('knowledge','言葉・知識','Word Game|Typing|Spelling|Trivia|Education|Language Learning|Science')]),
('systems','構築・経営','Systems','gear','#378c79','何を作り、回させる？','建てる・生産する・運営する層。プレイヤーが仕組みを組み、その結果を眺めて改善する。',[
('build','建てる・作る','Building|Base Building|City Builder|Crafting|Sandbox|Decorating|Level Editor|Open World Survival Craft'),
('automate','自動化・物流','Automation|Transportation|Trains'),
('manage','経営・資源','Management|Resource Management|Economy|Capitalism|Trading|Shop Keeper|Time Management|Inventory Management|Colony Sim|God Game|Political Sim|Zoo'),
('simulate','職業・暮らしの再現','Simulation|Life Sim|Farming Sim|Agriculture|Farming|Cooking|Mining|Fishing|Hunting|Cleaning|Medical Sim|Outbreak Sim|Hobby Sim|Job Simulator|Automobile Sim|Space Sim')]),
('progress','成長・収集','Progression','layers','#a47a39','何を積み上げ、集めさせる？','キャラクターや装備、数値が伸びていく層。報酬の手応えと長期的な動機を作る。',[
('rpg','RPG・育成','RPG|Action RPG|JRPG|CRPG|Party-Based RPG|Class-Based|Character Customization'),
('collect','収集・装備','Loot|Collectathon|Creature Collector|Gun Customization'),
('incremental','数値の伸び','Incremental|Idler')]),
('structure','構造・進行','Structure','route','#7d8b3a','1回のプレイと全体を、どう組み立てる？','周回・マップ・難易度・時間の流れなど、遊びの「器」を決める層。同じ動詞でも構造で別のゲームになる。',[
('runs','周回・ランダム生成','Roguelike|Roguelite|Action Roguelike|Traditional Roguelike|Mystery Dungeon|Dungeon Crawler|Procedural Generation|Music-Based Procedural Generation|Perma Death|Replay Value|Bullet Heaven'),
('world','探索・マップ構造','Adventure|Action-Adventure|Exploration|Open World|Metroidvania|Immersive Sim|Walking Simulator|Survival'),
('challenge','難しさ・挑戦','Difficult|Souls-like|Boss Rush|Score Attack|Time Attack'),
('pace','時間・進行の形式','Turn-Based|Real-Time|Real-Time with Pause|Time Manipulation|Linear|Nonlinear')]),
('story','物語・感情','Narrative','heart','#b86e79','どんな物語と感情を体験させる？','語り・人物・雰囲気・恐怖など、プレイヤーの心に残る体験の層。',[
('story','物語・分岐','Story Rich|Choices Matter|Multiple Endings|Visual Novel|Interactive Fiction|Choose Your Own Adventure|Dialogue Heavy|Text-Based|Lore-Rich|Narrative|Dynamic Narration|Point & Click|Based On A Novel|Cinematic|FMV'),
('character','人物・関係','Romance|Dating Sim|Otome|LGBTQ+|Female Protagonist|Villain Protagonist|Silent Protagonist|Desktop Companion'),
('mood','雰囲気・トーン','Atmospheric|Relaxing|Cozy|Wholesome|Cute|Funny|Comedy|Dark Humor|Dark Comedy|Satire|Parody|Memes|Emotional|Philosophical|Psychological|Epic|Nostalgia|Immersive'),
('fear','恐怖・緊張','Horror|Psychological Horror|Survival Horror|Thriller|Jump Scare|Dark|Violent|Gore'),
('mature','成人向け表現','Sexual Content|Nudity|Hentai')]),
('social','人数・関係','Players','people','#b16ca3','誰と、どんな関係で遊ぶ？','一人・協力・対戦・大人数など、プレイヤー同士の関係を決める層。',[
('solo','一人で','Singleplayer'),
('coop','協力','Co-op|Online Co-Op|Local Co-Op|Co-op Campaign|PvE|Team-Based'),
('versus','対戦・競技','PvP|Competitive|eSports|Battle Royale'),
('crowd','大人数・場の遊び','Multiplayer|Massively Multiplayer|MMORPG|Local Multiplayer|4 Player Local|Split Screen|Party Game|Party|Asynchronous Multiplayer|Asymmetric VR|Social Deduction|Family Friendly')]),
('world','世界観・題材','Setting','globe','#3f97b5','どんな世界・題材をまとわせる？','ルールを包む舞台・時代・モチーフの層。同じルールでも題材で意味が変わる。',[
('fantasy','幻想・超常','Fantasy|Dark Fantasy|Magic|Mythology|Dragons|Demons|Vampires|Werewolves|Elves|Dwarves|Zombies|Supernatural|Superhero|Lovecraftian|Gothic|Faith|Cult|Xianxia|Wuxia'),
('future','未来・宇宙','Sci-fi|Space|Futuristic|Cyberpunk|Robots|Mechs|Aliens|Spaceships|Mars|Dystopian|Post-apocalyptic|Steampunk|Transhumanism|Time Travel|Artificial Intelligence'),
('history','歴史・軍事','Historical|Medieval|Alternate History|Military|War|World War I|World War II|Cold War|Rome|Vikings|Samurai|Ninja|Western|Pirates|Tanks|Naval|Naval Combat'),
('modern','現代・犯罪','Modern|Crime|Noir|Conspiracy|Assassins|Espionage'),
('nature','自然・生き物','Nature|Animals|Cats|Dogs|Birds|Foxes|Wolves|Capybaras|Horses|Dinosaurs|Underwater|Underground|Snow|Submarine')]),
('presentation','表現・視点','Presentation','palette','#8d74b0','どう見せ、どう聞かせる？','カメラ・絵作り・音の層。遊びの読みやすさと第一印象を左右する。',[
('view','視点・次元','2D|3D|2.5D|First-Person|Third Person|Top-Down|Side Scroller|Isometric|VR|360 Video'),
('visual','絵作り','Pixel Graphics|Stylized|Realistic|Cartoony|Hand-drawn|Minimalist|Cartoon|Colorful|Anime|Retro|Old School|1980s|1990\'s|Surreal|Abstract|Comic Book|Psychedelic|Voxel|Beautiful'),
('sound','音・音楽','Music|Great Soundtrack|Soundtrack|Electronic Music|Instrumental Music|Rock Music|8-bit Music')]),
('format','形式・流通','Format','monitor','#7c8795','どこで、どんな形で届ける？','規模・入力デバイス・販売形態など、制作と流通の条件の層。遊びそのものより企画の前提になる。',[
('format','遊びの形式・規模','Casual|Arcade|Minigames|Short|Episodic|Experimental|Classic|Remake|Sequel|Reboot|Tutorial'),
('input','入力・デバイス','Controller|Touch-Friendly|Mouse Only|Voice Control|TrackIR|Hardware'),
('market','流通・ビジネス','Indie|Early Access|Free to Play|Moddable|Mod|Gaming|Addictive'),
('tools','ツール・非ゲーム','Utilities|Software|Design & Illustration|Animation & Modeling|Video Production|Audio Production|Photo Editing|Software Training|Benchmark|Game Development')])]
rows=read(FILES[0]); known={r['tag'] for r in rows}; assigned={}; clusters=[]
for cid,ja,en,icon,color,question,about,subs in spec:
    clusters.append(dict(id=cid,label=ja,en=en,icon=icon,color=color,question=question,description=about,subgroups=[dict(id=f'{cid}-{sid}',label=label) for sid,label,_ in subs]))
    for sid,label,terms in subs:
        for term in terms.split('|'):
            if term not in known: raise ValueError('Unknown tag '+term)
            if term in assigned: raise ValueError('Duplicate tag '+term)
            assigned[term]=(cid,f'{cid}-{sid}',label)
missing=known-assigned.keys()
if missing: raise ValueError('Unclassified tags '+repr(missing))
aliases={
'Precision Platformer':'精密プラットフォーマー ジャンプ 足場 高難度', 'Platformer':'プラットフォーマー ジャンプ 足場','2D Platformer':'2Dプラットフォーマー 横スクロール','3D Platformer':'3Dプラットフォーマー','Puzzle Platformer':'パズルプラットフォーマー','Automation':'自動化 工場 装置','Programming':'プログラミング 命令 自動化','Building':'建築 建設 組み立て','Economy':'経済 市場 お金','Resource Management':'資源管理 リソース','Farming Sim':'農業シミュレーション 栽培','Roguelike':'ローグライク','Roguelite':'ローグライト','Roguelike Deckbuilder':'ローグライクデッキ構築','Deckbuilding':'デッキ構築 カード','Card Game':'カードゲーム','Card Battler':'カードバトル','Board Game':'ボードゲーム','Physics':'物理 慣性 重力','Sokoban':'倉庫番 箱押し','Heist':'強盗 窃盗 泥棒','Stealth':'ステルス 隠密','Horror':'ホラー 恐怖','Psychological Horror':'心理ホラー','Co-op':'協力プレイ','Multiplayer':'マルチプレイ 複数人','Singleplayer':'シングルプレイ 一人用','Social Deduction':'社会的推理 人狼 正体隠匿','Tower Defense':'タワーディフェンス 防衛','Rhythm':'リズム 音楽','Trains':'鉄道 電車 列車','Cleaning':'掃除 清掃','Inventory Management':'インベントリ管理 持ち物 重量','Time Manipulation':'時間操作 巻き戻し','Time Travel':'タイムトラベル 時間旅行','Survival':'サバイバル 生存','Exploration':'探索 冒険','Space':'宇宙','Science':'科学','Logic':'論理 ロジック','Puzzle':'パズル','Mystery':'ミステリー 謎','Detective':'探偵 推理','Cute':'かわいい 可愛い','Relaxing':'リラックス 癒し','Cozy':'ほのぼの 心地よい','Parkour':'パルクール 壁走り','Crafting':'クラフト 工作','Turn-Based':'ターン制','Real-Time':'リアルタイム','Time Management':'時間管理','Strategy':'戦略 ストラテジー','Simulation':'シミュレーション','RPG':'ロールプレイング','Action':'アクション','Adventure':'アドベンチャー 冒険','Story Rich':'物語重視 ストーリー','Choices Matter':'選択が重要','Open World':'オープンワールド','City Builder':'都市建設 街づくり','Colony Sim':'コロニーシミュレーション','Creature Collector':'クリーチャー収集 育成','Collectathon':'収集 コレクション','Incremental':'インクリメンタル 増加 成長','Idler':'放置ゲーム','Perma Death':'永久死 ロスト','Procedural Generation':'手続き型生成 自動生成','Level Editor':'レベルエディタ ステージ制作','Dungeon Crawler':'ダンジョン探索','Bullet Hell':'弾幕','Bullet Heaven':'弾幕サバイバル','Boss Rush':'ボスラッシュ','Survival Horror':'サバイバルホラー','Sandbox':'サンドボックス 箱庭','Fishing':'釣り','Cooking':'料理','Farming':'農業 栽培','Trading':'交易 売買','Capitalism':'資本主義','Loot':'戦利品','Cats':'猫 ネコ','Dogs':'犬 イヌ','Birds':'鳥','Foxes':'狐 キツネ','Wolves':'狼 オオカミ','Capybaras':'カピバラ','Fantasy':'ファンタジー','Sci-fi':'SF サイエンスフィクション','Cyberpunk':'サイバーパンク','Medieval':'中世','Post-apocalyptic':'ポストアポカリプス 終末','Pixel Graphics':'ピクセルアート ドット絵','First-Person':'一人称','Third Person':'三人称','Top-Down':'見下ろし','Hand-drawn':'手描き','Music':'音楽','Asynchronous Multiplayer':'非同期マルチプレイ','Online Co-Op':'オンライン協力','Local Co-Op':'ローカル協力','Party Game':'パーティーゲーム','4X':'探索 拡張 開発 殲滅','Gambling':'ギャンブル 賭博','Chess':'チェス','Dice':'ダイス サイコロ','Poker':'ポーカー','Solitaire':'ソリティア','Mahjong':'麻雀','Typing':'タイピング','Metroidvania':'メトロイドヴァニア 探索 成長','Souls-like':'ソウルライク','Difficult':'高難易度','Score Attack':'スコアアタック','Time Attack':'タイムアタック','Narrative':'ナラティブ 物語','Artificial Intelligence':'人工知能 AI','Life Sim':'ライフシミュレーション 生活','Immersive Sim':'イマーシブシム 没入型','Management':'経営 管理','Team-Based':'チーム制','Turn-Based Tactics':'ターン制戦術','Turn-Based Strategy':'ターン制戦略','Real-Time with Pause':'ポーズ付きリアルタイム','Grid-Based Movement':'グリッド移動','Open World Survival Craft':'オープンワールドサバイバルクラフト','Intentionally Awkward Controls':'意図的に不自由な操作','Mouse Only':'マウスのみ','Touch-Friendly':'タッチ操作対応'}
secondary={
'Puzzle Platformer':['action'],'Precision Platformer':['structure'],'Metroidvania':['action','progress'],'Rhythm':['presentation'],'Music-Based Procedural Generation':['presentation'],
'Social Deduction':['puzzle'],'Heist':['strategy'],'Stealth':['puzzle'],'Survival':['systems'],'Survival Horror':['structure'],'Programming':['systems'],'Automation':['puzzle'],
'Roguelike Deckbuilder':['structure','progress'],'Deckbuilding':['progress'],'Auto Battler':['progress'],'Tower Defense':['systems'],'Colony Sim':['story'],
'Turn-Based Tactics':['puzzle'],'Time Manipulation':['puzzle'],'Trading':['social'],'Diplomacy':['social'],'Political Sim':['social','story'],'Creature Collector':['world'],
'Inventory Management':['puzzle'],'Farming Sim':['progress'],'Open World Survival Craft':['structure'],'Immersive Sim':['systems'],'Action RPG':['action'],
'Action Roguelike':['action'],'Action-Adventure':['action'],'Action RTS':['action'],'Strategy RPG':['progress'],'Tactical RPG':['progress'],'Party-Based RPG':['strategy'],
'MMORPG':['progress'],'Looter Shooter':['progress'],'Extraction Shooter':['structure'],'Battle Royale':['action','structure'],'Hero Shooter':['social'],'MOBA':['social'],
'Bullet Heaven':['action','progress'],'Bullet Hell':['structure'],'Souls-like':['action'],'Boss Rush':['action'],'Visual Novel':['presentation'],'Point & Click':['puzzle'],
'Mystery':['story'],'Detective':['story'],'Dating Sim':['systems'],'Life Sim':['story'],'Walking Simulator':['story'],'Dungeon Crawler':['progress'],'Level Editor':['format'],
'Game Development':['systems'],'Poker':['social'],'Party Game':['format'],'Asymmetric VR':['presentation'],'VR':['action'],'Physics':['systems'],'Destruction':['systems'],
'Sandbox':['structure'],'Base Building':['strategy'],'Cooking':['action'],'Time Management':['action'],'Typing':['action'],'Sports':['social'],'eSports':['format'],
'Fishing':['action'],'Hunting':['action'],'Space Sim':['world'],'Automobile Sim':['action'],'Naval Combat':['action'],'Wargame':['world'],'Military':['strategy'],'War':['strategy'],
'Zombies':['story'],'Lovecraftian':['story'],'Character Customization':['presentation'],'Gun Customization':['action'],'Loot':['structure'],'Procedural Generation':['systems'],
'Multiple Endings':['structure'],'Nonlinear':['story'],'Interactive Fiction':['puzzle'],'Dynamic Narration':['presentation'],'Cinematic':['presentation'],'FMV':['presentation'],
'Arcade':['structure'],'Desktop Companion':['format'],'Wholesome':['social'],'Gambling':['structure'],'Escape Room':['structure'],'Hacking':['world']}
for k,v in secondary.items():
    if k not in known: raise ValueError('Unknown secondary tag '+k)
    if any(c not in [x['id'] for x in clusters] for c in v): raise ValueError('Unknown cluster for '+k)
tag_notes=read_notes('tag_notes.psv')
if set(tag_notes)!=known: raise ValueError(f'Tag notes mismatch: missing {sorted(known-set(tag_notes))}, extra {sorted(set(tag_notes)-known)}')
tags=[]
for r in rows:
    cid,sid,label=assigned[r['tag']]; note=tag_notes[r['tag']]
    tags.append(dict(id='tag:'+str(r['rank']),kind='tag',label=r['tag'],alias=aliases.get(r['tag'],''),primaryCluster=cid,clusters=list(dict.fromkeys([cid]+secondary.get(r['tag'],[]))),subgroup=sid,description=note['summary'],summary=note['summary'],examples=note['examples'],play=note['play'],rank=int(r['rank']),source=r['source_url']))
# Mechanics keep their book chapter as subgroup; the cluster says which design question they serve.
chapterCluster={'STR':'social','TRN':'structure','ACT':'strategy','RES':'strategy','VIC':'structure','UNC':'puzzle','ECO':'systems','AUC':'strategy','WPL':'strategy','MOV':'action','ARC':'strategy','SET':'progress','CAR':'strategy'}
chapterSecondary={'STR':['structure'],'TRN':['strategy'],'ACT':['systems'],'VIC':['strategy'],'UNC':['strategy'],'ECO':['strategy'],'AUC':['systems','social'],'WPL':['systems'],'MOV':['strategy'],'ARC':['world'],'SET':['puzzle'],'CAR':['progress']}
mechanicPrimary={'STR-08':'structure','STR-09':'structure','STR-10':'structure','ACT-15':'progress','ACT-16':'progress','ACT-17':'structure','ACT-18':'story','ACT-19':'puzzle','ACT-21':'puzzle','ACT-22':'puzzle','ACT-23':'action',
'RES-08':'social','RES-10':'action','RES-15':'social','RES-16':'social','RES-17':'social','RES-24':'action','RES-25':'action','TRN-07':'action','TRN-08':'action','TRN-12':'action',
'UNC-01':'social','UNC-04':'social','UNC-05':'social','UNC-06':'social','UNC-11':'social','UNC-14':'social','UNC-02':'strategy','UNC-09':'strategy','UNC-10':'structure',
'ECO-16':'social','ECO-18':'social','ECO-19':'social','MOV-16':'structure','MOV-17':'structure','MOV-18':'structure','MOV-22':'structure','MOV-23':'structure','MOV-24':'puzzle',
'SET-02':'puzzle','SET-03':'puzzle','SET-04':'systems','CAR-05':'progress','CAR-06':'progress','CAR-07':'progress'}
mechanicExtra={'STR-07':['puzzle'],'ACT-18':['structure'],'RES-02':['story'],'RES-03':['story'],'UNC-12':['story'],'MOV-10':['systems','puzzle'],'ACT-06':['puzzle'],'ACT-07':['social'],'ECO-20':['systems'],'RES-23':['social'],'CAR-05':['strategy','structure'],'ECO-06':['progress'],'ECO-11':['progress']}
mech_notes=read_notes('mechanic_notes.psv')
mech_rows=read(FILES[1])
if set(mech_notes)!={r['id'] for r in mech_rows}: raise ValueError('Mechanic notes must cover exactly the 203 mechanic IDs')
mechs=[]
for r in mech_rows:
    code=r['id'].split('-')[0]; cls=mechanicPrimary.get(r['id'],chapterCluster[code]); note=mech_notes[r['id']]
    cs=list(dict.fromkeys([cls,chapterCluster[code]]+chapterSecondary.get(code,[])+mechanicExtra.get(r['id'],[])))
    mechs.append(dict(id=r['id'],kind='mechanic',label=r['name'],alias=r['chapter']+' '+r['id'],chapter=r['chapter'],chapterCode=code,primaryCluster=cls,clusters=cs,subgroup=code,description=r['idea'],summary=note['summary'],examples=note['examples'],play=note['play'],source='https://www.hanmoto.com/bd/isbn/9784798176741'))
# Preserve supplied human/AI brainstorms without promoting numeric heuristics into measured quality scores.
fusions=[]
for r in read(FILES[2]):
    fusions.append(dict(id=r['fusion_id'],tagId='tag:'+r['steam_rank'],mechanicId=r['mechanic_id'],conceptId=r['project_id'],title=r['project_name'],rule=r['central_rule'],example=r['sample_turn'],mvp=r['mvp'],risk=r['risk'],origin='prior-brainstorm'))
concepts=[]
for r in read(FILES[3]):
    nameToId={t['label']:t['id'] for t in tags}
    concepts.append(dict(id=r['id'],title=r['title'],materials=[nameToId[t.strip()] for t in r['tags'].split('/') if t.strip() in nameToId]+[t.strip() for t in r['mechanic_ids'].split('/')],rule=r['core'],example=r['example'],mvp=r['mvp'],risk=r['risk'],novelty=r['novelty']))
chapters=list(dict.fromkeys(m['chapterCode'] for m in mechs))
data=dict(schemaVersion=1,meta=dict(title='Game Brainstormer seed catalogue',snapshot='2026-10-11',prepared='2026-11-09',taxonomyRevised='2026-11-09',tagCount=len(tags),mechanicCount=len(mechs),fusionCount=len(fusions),conceptCount=len(concepts),classificationMethod='Editorial game-design taxonomy (one design question per cluster) with explicit multi-label facets; not an embedding model.',notesScope='summary, examples and play (Caillois agon/alea/mimicry/ilinx 0-3) are original editorial annotations in data/editorial; examples are illustrative, not rankings or market evidence.',rankMeaning='Supplied 2026-10-11 Steam tag frequency order; not live sales or player demand.',bookScope='Names, IDs and chapters from the supplied index; descriptions are original brainstorming examples, not reproduced book definitions.'),clusters=clusters,chapters=[dict(id=c,label=next(m['chapter'] for m in mechs if m['chapterCode']==c)) for c in chapters],materials=tags+mechs,fusions=fusions,concepts=concepts)
for p in [ROOT/'src/data/catalog.json',ROOT/'public/catalog.json']:
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
report={c['label']:sum(m['primaryCluster']==c['id'] for m in tags) for c in clusters}
print(json.dumps(dict(counts=report,total=len(tags),mechanics=len(mechs),fusions=len(fusions),concepts=len(concepts)),ensure_ascii=False,indent=2))
