"""Portable renderer regression tests. Requires Python + Playwright + Chromium.

This intentionally injects the actual HTML with set_content: restricted evaluation
browsers can forbid file:// and localhost navigation. Native localStorage is therefore
unavailable; its Storage contract is covered in core.test.mjs, not claimed here.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'portable/game-brainstormer.html').read_text()
REPORT=[]
def passed(name):
    REPORT.append({'name':name,'passed':True})
    print('PASS',name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1680,'height':1050},accept_downloads=True)
    page=context.new_page()
    errors=[]; requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.set_content(HTML,wait_until='load')
    assert page.locator('[data-node]').count()==6
    assert page.locator('[data-edge].wire').count()==4
    assert page.locator('.cluster-tile').count()==11
    passed('initial board, all ten semantic clusters and connections render')
    page.wait_for_timeout(5200)
    page.screenshot(path=ROOT/'docs/images/workspace.png')
    page.locator('.ribbon').screenshot(path=ROOT/'docs/images/semantic-ribbon.png')
    assert requests==[], requests
    passed('single HTML renders without any network requests')
    page.locator('[data-action="cluster"][data-id="all"]').click()
    assert page.locator('.library-item').count()==429
    q=page.get_by_role('searchbox',name='素材を検索')
    q.fill('精密')
    assert page.locator('.library-item').count()==1
    assert page.locator('.library-item').inner_text().find('Precision Platformer')>=0
    q.fill('Ｐｒｅｃｉｓｉｏｎ')
    assert page.locator('.library-item').count()==1
    passed('all 429 tags, Japanese search and NFKC full-width search')
    page.locator('[data-action="tab"][data-id="mechanic"]').click()
    assert page.locator('.library-item').count()==203
    page.locator('[data-bind="chapter"]').select_option('ECO')
    assert page.locator('.library-item').count()==20
    q.fill('ECO-07')
    assert page.locator('.library-item').count()==1
    page.locator('[data-action="add-material"][data-id="ECO-07"]').click()
    assert page.locator('[data-node]').count()==7
    passed('all 203 mechanics, chapter filtering and adding a card')
    page.locator('[data-action="undo"]').click()
    assert page.locator('[data-node]').count()==6
    page.locator('[data-action="redo"]').click()
    assert page.locator('[data-node]').count()==7
    page.locator('[data-action="undo"]').click()
    passed('toolbar undo and redo')
    # The seeded tray has two tags and two mechanisms.
    page.locator('[data-action="react"]').click()
    assert page.locator('.hypothesis-card').count()>=2
    page.screenshot(path=ROOT/'docs/images/reactions.png')
    page.locator('[data-action="add-hypothesis"]').first.click()
    assert page.locator('[data-node]').count()==7
    assert page.locator('[data-bind="hyp-mvp"]').count()==1
    passed('rule-based reactions generate editable hypotheses with MVP and risk')
    title=page.locator('[data-bind="node-title"]')
    title.fill('テスト仮説 <b>文字として保存</b>')
    title.press('Tab')
    assert page.locator('.board-node .node-title').filter(has_text='テスト仮説').count()==1
    assert page.locator('.board-node .node-title b').count()==0
    page.locator('[data-bind="hyp-risk"]').fill('試作で検証する、保存テスト。')
    page.locator('[data-bind="hyp-risk"]').press('Tab')
    passed('editable title and risk; injected markup remains plain text')
    # Text edits must not consume the board deletion shortcut.
    count=page.locator('[data-node]').count()
    title=page.locator('[data-bind="node-title"]')
    title.click();title.press('Backspace')
    assert page.locator('[data-node]').count()==count
    page.locator('[data-action="panel"][data-id="lab"]').click()
    passed('keyboard editing is isolated from board shortcuts')
    page.locator('[data-action="tool"][data-id="connect"]').click()
    a=page.locator('[data-node="seed-platformer"]')
    b=page.locator('[data-node="seed-automation"]')
    old=page.locator('[data-edge].wire').count()
    a.click(position={'x':40,'y':35});b.click(position={'x':40,'y':35})
    assert page.locator('[data-edge].wire').count()==old+1
    passed('connect tool links two cards')
    # Moving a card updates its model and is undone as one operation.
    target=page.locator('[data-node="seed-platformer"]');before=target.get_attribute('style')
    box=target.bounding_box();page.mouse.move(box['x']+35,box['y']+25);page.mouse.down();page.mouse.move(box['x']+95,box['y']+75,steps=6);page.mouse.up()
    assert page.locator('[data-node="seed-platformer"]').get_attribute('style')!=before
    page.locator('[data-action="undo"]').click()
    assert page.locator('[data-node="seed-platformer"]').get_attribute('style')==before
    passed('dragging cards and undoing the gesture')
    page.locator('[data-action="note"]').click()
    assert page.locator('[data-bind="node-title"]').input_value()=='ひとつの問い'
    page.locator('[data-action="duplicate"]').first.click()
    n=page.locator('[data-node]').count()
    page.locator('[data-action="delete"]').first.click()
    assert page.locator('[data-node]').count()==n-1
    passed('sticky notes, duplicate and delete')
    page.locator('.export-menu summary').click()
    with page.expect_download() as download:
        page.locator('[data-action="export-json"]').click()
    path=download.value.path()
    saved=json.loads(Path(path).read_text())
    assert saved['schemaVersion']==1
    assert len(saved['boards'])==1
    page.locator('#import-file').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':json.dumps(saved).encode()})
    page.wait_for_timeout(200)
    assert page.locator('.board-switch option').count()==2
    passed('JSON export and additive import round-trip')
    page.locator('#import-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{"schemaVersion":999}'})
    page.wait_for_timeout(100)
    assert page.locator('.board-switch option').count()==2
    assert '対応していない' in page.locator('.toast').inner_text()
    passed('invalid JSON import preserves existing boards')
    page.locator('[data-action="help"]').click()
    assert page.locator('dialog[open]').count()==1
    page.locator('dialog').get_by_role('button',name='閉じる').click()
    passed('accessible native help dialog opens and closes')
    assert errors==[],errors
    passed('no browser JavaScript exceptions')
    # Responsive layout in a separate clean document.
    mobile=context.new_page()
    mobile.set_viewport_size({'width':390,'height':844})
    mobile.set_content(HTML,wait_until='load')
    mobile.locator('[data-action="mobile"][data-id="library"]').click()
    assert mobile.locator('.library').is_visible()
    mobile.get_by_role('searchbox',name='素材を検索').fill('Precision')
    assert mobile.locator('.library-item').count()==1
    mobile.get_by_role('button',name='素材パネルを閉じる').click()
    assert not mobile.locator('.library').is_visible()
    mobile.locator('[data-action="open-lab"]').click()
    assert mobile.locator('.lab').is_visible()
    mobile.wait_for_timeout(5200)
    mobile.screenshot(path=ROOT/'docs/images/mobile.png')
    assert mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    passed('390px mobile: material drawer, lab drawer, no horizontal overflow')
    context.close();browser.close()
(ROOT/'docs/portable-test-results.json').write_text(json.dumps({'environment':'Chromium / actual portable HTML injected with Playwright set_content; browser navigation restricted; native localStorage unavailable','tests':REPORT,'count':len(REPORT),'allPassed':True},indent=2,ensure_ascii=False))
print(f'{len(REPORT)} browser checks passed.')
