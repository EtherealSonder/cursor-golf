import { RobotNavigationGrid } from "../navigation/RobotNavigationGrid";
import { RobotInteractionRegistry } from "../entities/robots/RobotInteractionRegistry";
import { RobotDynamicObstacleLayer } from "../navigation/RobotDynamicObstacleLayer";
import { RobotPathCache } from "../navigation/RobotPathCache";
import { RobotNavigationScheduler } from "../navigation/RobotNavigationScheduler";
/** Lightweight deterministic RN-4 contract checks, called once in development. */
export function assertRobotDynamicNavigationValidation():void {
    const grid=new RobotNavigationGrid(0,0,24,12,12),registry=new RobotInteractionRegistry();
    let x=108;
    const unregister=registry.registerCircularEntity('moving-crate','Crate',30,()=>x,()=>108);
    const layer=new RobotDynamicObstacleLayer(grid,registry,10);
    layer.update(1);
    if(!layer.isBlocked(4,4))throw new Error('[RN-4] Dynamic obstacle occupancy failed');
    x=240;layer.update(1);
    if(layer.isBlocked(4,4))throw new Error('[RN-4] Dynamic obstacle did not vacate old cells');
    unregister();layer.update(1);
    if(layer.getOccupiedCount()!==0)throw new Error('[RN-4] Unregistered obstacle remains blocked');
    const cache=new RobotPathCache();cache.set('a',1,[{x:1,y:1}]);
    if(!cache.get('a',1)||cache.get('a',2))throw new Error('[RN-4] Cache generation validation failed');
    const scheduler=new RobotNavigationScheduler();scheduler.beginFrame();
    if(scheduler.tryAcquire(500)<=0)throw new Error('[RN-4] Search scheduler failed');
}
