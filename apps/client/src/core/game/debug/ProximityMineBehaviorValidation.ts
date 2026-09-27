import { PROXIMITY_MINE_DEFINITION as D } from '../config/ProximityMineDefinition';
import { advanceArmingProgress, countdownDuration, detectProximityMineTarget, type ProximityMineTarget } from '../entities/mechanisms/ProximityMineDetection';
/** Optional pure PM-1 regression checks; invoke explicitly from a debug/test runner. */
export function validateProximityMineBehavior(): void {
    const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(`[PM-1] ${message}`); };
    const target = (surface: number, label = 'Ball'): ProximityMineTarget => ({
        id: label, label, x: surface + 10, y: 0, radius: 10,
    });
    const detect = (targets: readonly ProximityMineTarget[]) => detectProximityMineTarget(
        0, 0, targets, D.detectionRadius, D.contactRadius, D.armingRadius);
    assert(detect([target(D.detectionRadius + 0.1)]).zone === 'NONE', 'outside detection');
    assert(detect([target(D.detectionRadius)]).zone === 'DETECTED', 'detection boundary');
    assert(detect([target(D.armingRadius + 1)]).zone === 'DETECTED', 'outer zone must not arm');
    assert(detect([target(D.armingRadius)]).zone === 'ARMING', 'arming boundary');
    assert(detect([target(D.contactRadius)]).zone === 'CONTACT', 'physical contact');
    assert(detect([target(30, 'Ball'), target(60, 'Crate')]).target?.label === 'Ball', 'nearest target');
    assert(detect([target(60, 'Crate'), target(30, 'Ball')]).target?.label === 'Ball', 'target order independence');
    assert(countdownDuration(1, D.outerArmingSeconds, D.innerArmingSeconds) <
        countdownDuration(0, D.outerArmingSeconds, D.innerArmingSeconds), 'closer is faster');
    let progress = 0;
    for (let i = 0; i < 10; i++) progress = advanceArmingProgress(progress, 0.1, 'DETECTED', 0,
        D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond);
    assert(progress === 0, 'outer detection does not start timer');
    progress = advanceArmingProgress(progress, 1, 'ARMING', 0,
        D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond);
    const closer = advanceArmingProgress(progress, 0.5, 'ARMING', 1,
        D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond);
    assert(closer > progress + 0.1, 'approach accelerates countdown');
    const retreated = advanceArmingProgress(closer, 0.5, 'DETECTED', 0,
        D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond);
    assert(retreated < closer, 'retreat decays countdown');
    assert(advanceArmingProgress(0, 0, 'CONTACT', 1,
        D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond) === 1, 'contact is immediate');
    console.info('[PM-1] Proximity mine behavior validation: PASS');
}
