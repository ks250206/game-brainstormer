import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { useWorkbench } from './context.tsx';
import { Icon } from './Icons.tsx';

/** Switch the centre area between the whiteboard and the two-axis map. */
export function ViewSwitch() {
    const { store, state } = useWorkbench();
    return <div className="view-switch"><SegmentedControl label="表示の切り替え" size="sm" value={state.view} onChange={v => store.ui({ view: v as 'board' | 'quadrant' })}>
        <SegmentedControlItem value="board" label="ホワイトボード" icon={<Icon name="board"/>}/>
        <SegmentedControlItem value="quadrant" label="二軸四象限マップ" icon={<Icon name="quadrant"/>}/>
    </SegmentedControl></div>;
}
export function MobileNav() {
    const { store, state } = useWorkbench();
    return <nav className="mobile-nav" aria-label="パネル切り替え"><button onClick={() => store.ui({ mobilePanel: state.mobilePanel === 'library' ? 'none' : 'library' })}>素材</button><button onClick={() => store.ui({ mobilePanel: 'none' })}>ボード</button><button onClick={() => store.ui({ mobilePanel: state.mobilePanel === 'lab' ? 'none' : 'lab' })}>ラボ</button></nav>;
}
