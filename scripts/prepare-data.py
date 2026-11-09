"""Build a versioned, auditable semantic catalogue from the supplied CSV corpus.
No embeddings or network calls: this is an explicit editorial semantic taxonomy.
"""
import csv,json,collections,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=ROOT/'data/source'
FILES=['steam429_tags_ranked.csv','precision_platformer_203_catalog.csv','steam203_mechanics_500_fusions.csv','precision_platformer_45_concepts.csv']
for name in FILES:
    target=SOURCES/name
    if not target.exists():
        source=ROOT.parent/name
        if not source.exists(): raise FileNotFoundError(f'Missing input: {target}')
        shutil.copyfile(source,target)
def read(name): return list(csv.DictReader((SOURCES/name).open(encoding='utf-8-sig')))
# Every tag is explicitly placed once. Secondary facets are separate, not extra invented Steam tags.
spec=[
('movement','移動・操作','Movement','move','#635bda',[
('platform','跳ぶ・走る', 'Platformer|2D Platformer|3D Platformer|Puzzle Platformer|Precision Platformer|Parkour|Runner|Metroidvania|Lemmings'),
('physical','物理・手ざわり','Physics|6DOF|Flight|Intentionally Awkward Controls|Quick-Time Events|Pinball|Mouse Only|Voice Control'),
('rhythm','リズム・時間','Rhythm|Music-Based Procedural Generation|Time Manipulation|Bullet Time|Time Attack|Fast-Paced|Real-Time|Real-Time with Pause|Turn-Based|Turn-Based Combat|Grid-Based Movement|On-Rails Shooter'),
('sports','乗り物・スポーツ','Racing|Driving|Sports|Automobile Sim|Combat Racing|Golf|Mini Golf|Football (Soccer)|Football (American)|Basketball|Baseball|Boxing|Motorbike|Bikes|Wrestling|Skateboarding|Billiards|Skating|Cycling|Tennis|Motocross|Hockey|Bowling|Skiing|Snowboarding|ATV|BMX|Volleyball|Cricket|Rugby|Offroad')]),
('combat','戦闘・競争','Conflict','sword','#cc7359',[
('combat','戦う・狙う','Action|Combat|Shooter|FPS|Top-Down Shooter|Third-Person Shooter|Arena Shooter|Hero Shooter|Boomer Shooter|Extraction Shooter|Twin Stick Shooter|Shoot \'Em Up|Looter Shooter|Hack and Slash|Swordplay|Character Action Game|Beat \'em up|Fighting|2D Fighter|3D Fighter|Spectacle fighter|Musou|Martial Arts|Archery|Sniper|Vehicular Combat|Naval Combat|Battle Royale'),
('challenge','難所・競争','Bullet Hell|Bullet Heaven|Boss Rush|Souls-like|Difficult|Score Attack|Competitive|eSports|War|Wargame'),
('tactics','戦術・陣取り','Strategy|Tactical|Turn-Based Tactics|Real Time Tactics|Turn-Based Strategy|Strategy RPG|Tactical RPG|RTS|Action RTS|Auto Battler|MOBA|Grand Strategy|4X|Tower Defense|Chess|Hex Grid')]),
('thinking','思考・発見','Thinking','puzzle','#517fa7',[
('logic','論理・配置','Puzzle|Logic|Sokoban|Match 3|Solitaire|Mahjong|Falling Blocks|Organizing|Tabletop|Board Game|Dice|Poker|Gambling'),
('discovery','推理・情報','Mystery|Detective|Investigation|Hidden Object|Escape Room|Social Deduction|Hacking|Conspiracy|Stealth|Heist|Espionage'),
('learning','知識・学習','Word Game|Typing|Spelling|Trivia|Education|Language Learning|Science|Tutorial|Artificial Intelligence')]),
('systems','構築・経済','Systems','gear','#378c79',[
('build','組む・自動化','Automation|Programming|Building|Base Building|Crafting|City Builder|Colony Sim|Level Editor|Destruction|Sandbox|Open World Survival Craft|Game Development|Decorating'),
('economy','資源・運営','Resource Management|Management|Economy|Capitalism|Trading|Time Management|Inventory Management|Transportation|Trains|Shop Keeper|Political Sim|Job Simulator|God Game|Diplomacy'),
('life','暮らし・生産','Simulation|Life Sim|Farming Sim|Agriculture|Farming|Cooking|Mining|Fishing|Hunting|Cleaning|Medical Sim|Outbreak Sim|Hobby Sim|Zoo')]),
('progress','成長・収集','Progression','layers','#a47a39',[
('growth','成長・構築','RPG|Action RPG|JRPG|CRPG|Party-Based RPG|Class-Based|Character Customization|Gun Customization|Loot|Creature Collector|Collectathon|Incremental|Idler|Deckbuilding|Roguelike Deckbuilder|Card Game|Card Battler|Trading Card Game'),
('runs','周回・危険','Roguelike|Roguelite|Action Roguelike|Traditional Roguelike|Dungeon Crawler|Mystery Dungeon|Survival|Survival Horror|Perma Death|Procedural Generation|Replay Value'),
('explore','探索・空間','Adventure|Action-Adventure|Exploration|Open World|Immersive Sim|Walking Simulator|Space Sim')]),
('social','関係・参加','Social','people','#b16ca3',[
('cooperate','協力・共在','Co-op|Online Co-Op|Local Co-Op|Co-op Campaign|Team-Based|PvE|Family Friendly|Wholesome'),
('compete','人数・対人','Singleplayer|Multiplayer|Massively Multiplayer|PvP|Local Multiplayer|4 Player Local|Party Game|Party|MMORPG|Split Screen|Asynchronous Multiplayer|Asymmetric VR'),
('character','人物・つながり','Romance|Dating Sim|Otome|LGBTQ+|Female Protagonist|Villain Protagonist|Silent Protagonist|Desktop Companion')]),
('world','世界・題材','Worlds','globe','#528c9e',[
('fantasy','幻想・伝承','Fantasy|Dark Fantasy|Magic|Mythology|Dragons|Demons|Vampires|Werewolves|Elves|Dwarves|Supernatural|Superhero|Lovecraftian|Gothic|Faith|Cult|Xianxia|Wuxia'),
('future','未来・宇宙','Sci-fi|Space|Futuristic|Cyberpunk|Robots|Mechs|Aliens|Spaceships|Mars|Dystopian|Post-apocalyptic|Steampunk|Transhumanism|Time Travel'),
('history','時代・社会','Historical|Medieval|Alternate History|Military|Modern|World War I|World War II|Cold War|Rome|Vikings|Samurai|Ninja|Western|Pirates|Assassins|Crime|Noir|Tanks|Naval'),
('nature','自然・生物','Nature|Animals|Cats|Dogs|Birds|Foxes|Wolves|Capybaras|Horses|Dinosaurs|Zombies|Underwater|Underground|Snow|Submarine|Sailing')]),
('feeling','物語・感情','Feeling','heart','#b86e79',[
('story','物語・分岐','Story Rich|Choices Matter|Multiple Endings|Visual Novel|Interactive Fiction|Choose Your Own Adventure|Dialogue Heavy|Text-Based|Lore-Rich|Narrative|Dynamic Narration|Nonlinear|Linear|Point & Click|Based On A Novel|Episodic|Cinematic'),
('mood','感情・雰囲気','Atmospheric|Relaxing|Cozy|Cute|Funny|Comedy|Dark Humor|Dark Comedy|Satire|Parody|Memes|Emotional|Philosophical|Psychological|Epic|Nostalgia|Immersive|Beautiful'),
('fear','恐怖・刺激','Horror|Psychological Horror|Thriller|Jump Scare|Dark|Violent|Gore'),
('mature','成人向け表現','Sexual Content|Nudity|Hentai')]),
('aesthetic','表現・視点','Aesthetics','palette','#89749f',[
('view','視点・次元','2D|3D|2.5D|First-Person|Third Person|Top-Down|Side Scroller|Isometric|VR|360 Video'),
('visual','視覚言語','Pixel Graphics|Stylized|Realistic|Cartoony|Hand-drawn|Minimalist|Cartoon|Colorful|Anime|Retro|Old School|1980s|1990\'s|Surreal|Abstract|Comic Book|Psychedelic|Voxel|FMV'),
('sound','音・音楽','Music|Great Soundtrack|Soundtrack|Electronic Music|Instrumental Music|Rock Music|8-bit Music')]),
('format','形式・制作','Format','monitor','#7c8795',[
('format','遊びの枠組み','Casual|Arcade|Minigames|Short|Experimental|Classic|Remake|Sequel|Reboot'),
('tools','道具・入力環境','Controller|Touch-Friendly|TrackIR|Hardware|Utilities|Software|Design & Illustration|Animation & Modeling|Video Production|Audio Production|Photo Editing|Software Training|Benchmark|Moddable|Mod'),
('market','販売・メタ情報','Indie|Early Access|Free to Play|Gaming|Addictive')])]
rows=read(FILES[0]); known={r['tag'] for r in rows}; assigned={}; clusters=[]
for cid,ja,en,icon,color,subs in spec:
    clusters.append(dict(id=cid,label=ja,en=en,icon=icon,color=color,subgroups=[dict(id=f'{cid}-{sid}',label=label) for sid,label,_ in subs]))
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
'Puzzle Platformer':['thinking'],'Metroidvania':['progress'],'Rhythm':['aesthetic'],'Music-Based Procedural Generation':['aesthetic','systems'],'Physics':['thinking'],'Sokoban':['movement'],'Social Deduction':['social'],'Heist':['progress'],'Survival Horror':['feeling'],'Programming':['thinking'],'Automation':['thinking'],'Building':['progress'],'Co-op':['thinking'],'Roguelike Deckbuilder':['thinking'],'Deckbuilding':['thinking'],'Card Game':['thinking'],'Tower Defense':['systems'],'Colony Sim':['progress'],'Turn-Based Tactics':['thinking'],'Time Manipulation':['thinking'],'Trading':['social'],'Diplomacy':['social'],'Creature Collector':['world'],'Inventory Management':['thinking'],'Farming Sim':['world','progress'],'Trains':['movement'],'Cleaning':['progress'],'Mystery':['feeling'],'Stealth':['combat'],'Horror':['world'],'Sci-fi':['aesthetic'],'Cyberpunk':['aesthetic'],'Political Sim':['social'],'Wholesome':['feeling'],'Family Friendly':['format'],'MMORPG':['progress'],'Cozy':['social'],'Artificial Intelligence':['systems'],'Level Editor':['format'],'Loot':['combat'],'Battle Royale':['social'],'Character Customization':['aesthetic'],'Gun Customization':['combat'],'Intentionally Awkward Controls':['feeling'],'VR':['movement'],'Asymmetric VR':['aesthetic']}
tags=[]
for r in rows:
    cid,sid,label=assigned[r['tag']]
    tags.append(dict(id='tag:'+str(r['rank']),kind='tag',label=r['tag'],alias=aliases.get(r['tag'],''),primaryCluster=cid,clusters=[cid]+secondary.get(r['tag'],[]),subgroup=sid,description=f'{label}に関わる体験・属性。単独のルールではなく、他の素材との役割を決めて使う。',rank=int(r['rank']),source=r['source_url']))
chapterCluster={'STR':'social','TRN':'movement','ACT':'thinking','RES':'combat','VIC':'progress','UNC':'thinking','ECO':'systems','AUC':'systems','WPL':'systems','MOV':'movement','ARC':'combat','SET':'progress','CAR':'progress'}
mechs=[]
for r in read(FILES[1]):
    code=r['id'].split('-')[0]; cls=chapterCluster[code]; cs=[cls]
    if code in ['AUC','WPL','CAR','TRN']: cs.append('thinking')
    if code in ['ARC','MOV','ACT']: cs.append('systems')
    if code in ['AUC','UNC']: cs.append('social')
    if r['id']=='ACT-18': cs.append('feeling')
    if r['id'] in ['MOV-10','ACT-06','ACT-07','ECO-20']: cs.append('systems')
    if r['id']=='RES-23': cs.append('social')
    mechs.append(dict(id=r['id'],kind='mechanic',label=r['name'],alias=r['chapter']+' '+r['id'],chapter=r['chapter'],chapterCode=code,primaryCluster=cls,clusters=list(dict.fromkeys(cs)),subgroup=code,description=r['idea'],source='https://www.hanmoto.com/bd/isbn/9784798176741'))
# Preserve supplied human/AI brainstorms without promoting numeric heuristics into measured quality scores.
fusions=[]
for r in read(FILES[2]):
    fusions.append(dict(id=r['fusion_id'],tagId='tag:'+r['steam_rank'],mechanicId=r['mechanic_id'],conceptId=r['project_id'],title=r['project_name'],rule=r['central_rule'],example=r['sample_turn'],mvp=r['mvp'],risk=r['risk'],origin='prior-brainstorm'))
concepts=[]
for r in read(FILES[3]):
    nameToId={t['label']:t['id'] for t in tags}
    concepts.append(dict(id=r['id'],title=r['title'],materials=[nameToId[t.strip()] for t in r['tags'].split('/') if t.strip() in nameToId]+[t.strip() for t in r['mechanic_ids'].split('/')],rule=r['core'],example=r['example'],mvp=r['mvp'],risk=r['risk'],novelty=r['novelty']))
chapters=list(dict.fromkeys(m['chapterCode'] for m in mechs))
data=dict(schemaVersion=1,meta=dict(title='Game Brainstormer seed catalogue',snapshot='2026-10-11',prepared='2026-11-09',tagCount=len(tags),mechanicCount=len(mechs),fusionCount=len(fusions),conceptCount=len(concepts),classificationMethod='Editorial semantic taxonomy with explicit multi-label facets; not an embedding model.',rankMeaning='Supplied 2026-10-11 Steam tag frequency order; not live sales or player demand.',bookScope='Names, IDs and chapters from the supplied index; descriptions are original brainstorming examples, not reproduced book definitions.'),clusters=clusters,chapters=[dict(id=c,label=next(m['chapter'] for m in mechs if m['chapterCode']==c)) for c in chapters],materials=tags+mechs,fusions=fusions,concepts=concepts)
for p in [ROOT/'src/data/catalog.json',ROOT/'public/catalog.json']:
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
report={c['label']:sum(m['primaryCluster']==c['id'] for m in tags) for c in clusters}
print(json.dumps(dict(counts=report,total=len(tags),mechanics=len(mechs),fusions=len(fusions),concepts=len(concepts)),ensure_ascii=False,indent=2))
