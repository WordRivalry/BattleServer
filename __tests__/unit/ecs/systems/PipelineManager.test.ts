import {System} from "../../../../src/modules/gameEngine/ecs/systems/System";
import {ECManager} from "../../../../src/modules/gameEngine/ecs/ECManager";
import {TypedEventEmitter} from "../../../../src/modules/gameEngine/ecs/systems/TypedEventEmitter";
import {Component} from "../../../../src/modules/gameEngine/ecs/components/Component";
import {EntityManager} from "../../../../src/modules/gameEngine/ecs/entities/EntityManager";
import {ComponentManager, ComponentType} from "../../../../src/modules/gameEngine/ecs/components/ComponentManager";
import {PipelineManager} from "../../../../src/modules/gameEngine/ecs/systems/PipelineManager";

abstract class  SystemMock implements System {
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;
    init(ecManager: ECManager, eventSystem: TypedEventEmitter): void {this.initCalled = true;}

    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
    abstract requiredComponents: ComponentType[];
}

class ComponentA extends Component {}
class ComponentB extends Component {}
class ComponentC extends Component {}
class ComponentD extends Component {}
class ComponentE extends Component {}
class SystemA extends SystemMock {requiredComponents = [ComponentA]; }
class SystemB extends SystemMock {requiredComponents = [ComponentB];}
class SystemC extends SystemMock {requiredComponents = [ComponentC];}
class SystemD extends SystemMock {requiredComponents = [ComponentD];}
class SystemE extends SystemMock {requiredComponents = [ComponentE];}

describe('SystemPipelineManager', () => {
    let pipelineManager: PipelineManager;
    let ecManager: ECManager;
    let eventSystem: TypedEventEmitter;

    beforeEach(() => {
        ecManager = new ECManager(new EntityManager(), new ComponentManager());
        eventSystem = new TypedEventEmitter();
        pipelineManager = new PipelineManager();
    });

    it('should update systems based on entity component matching', () => {
        const systemA = new SystemA();
        pipelineManager.addSystem(systemA);

        const entity1 = ecManager.createEntity();
        ecManager.addComponent(entity1, ComponentA, new ComponentA());

        pipelineManager.update(1, ecManager, eventSystem);
        expect(systemA.updateCalled).toBe(true);
        expect(systemA.updateCallCount).toBe(1);
    });

    describe('sub-systems update', () => {

        let systemA: SystemA;
        let systemB: SystemB;
        let systemC: SystemC;
        let systemD: SystemD;

        beforeEach(() => {
            systemA = new SystemA();
            systemB = new SystemB(); // sub-system of systemA
            systemC = new SystemC(); // sub-system of systemB
            systemD = new SystemD(); // Linear to SystemA
            pipelineManager.addSystem(systemA);     // A
            pipelineManager.beginSubPipeline()      // Start sub-pipeline
            pipelineManager.addSystem(systemB);     //  -> B
            pipelineManager.addSystem(systemC);     //  -> C
            pipelineManager.endSubPipeline()        // End sub-pipeline
            pipelineManager.addSystem(systemD);     // D
        });

        it('does not updates any system, if no matched entities', () => {
            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(false);
            expect(systemB.updateCalled).toBe(false);
            expect(systemC.updateCalled).toBe(false);
            expect(systemD.updateCalled).toBe(false);
        });

        it('Parent system has matched entities, sub-system does not, sub-system do not update', () => {
            const entity1 = ecManager.createEntity();
            ecManager.addComponent(entity1, ComponentA, new ComponentA());

            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(true);
            expect(systemB.updateCalled).toBe(false);
            expect(systemC.updateCalled).toBe(false);
            expect(systemD.updateCalled).toBe(false);
        });

        it('Parent system has matched entities, sub-system also, sub-system do update', () => {
            const entity1 = ecManager.createEntity();
            ecManager.addComponent(entity1, ComponentA, new ComponentA());
            const entity2 = ecManager.createEntity();
            ecManager.addComponent(entity2, ComponentB, new ComponentB());

            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(true);
            expect(systemB.updateCalled).toBe(true);
            expect(systemC.updateCalled).toBe(false);
            expect(systemD.updateCalled).toBe(false);
        });

        it('does not update a sub-system if it has not matched entities', () => {
            const entity1 = ecManager.createEntity();
            ecManager.addComponent(entity1, ComponentA, new ComponentA());
            const entity3 = ecManager.createEntity();
            ecManager.addComponent(entity3, ComponentC, new ComponentC());

            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(true);
            expect(systemB.updateCalled).toBe(false);
            expect(systemC.updateCalled).toBe(true);
            expect(systemD.updateCalled).toBe(false);
        });

        it('updates entire sub-pipeline if all systems have matched entities', () => {
            const entity1 = ecManager.createEntity();
            ecManager.addComponent(entity1, ComponentA, new ComponentA());
            const entity2 = ecManager.createEntity();
            ecManager.addComponent(entity2, ComponentB, new ComponentB());
            const entity3 = ecManager.createEntity();
            ecManager.addComponent(entity3, ComponentC, new ComponentC());

            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(true);
            expect(systemB.updateCalled).toBe(true);
            expect(systemC.updateCalled).toBe(true);
            expect(systemD.updateCalled).toBe(false);
        });

        it('updates only main system, if sub-systems have not matched entities', () => {
            const entity1 = ecManager.createEntity();
            ecManager.addComponent(entity1, ComponentA, new ComponentA());
            const entity4 = ecManager.createEntity();
            ecManager.addComponent(entity4, ComponentD, new ComponentD());

            pipelineManager.update(1, ecManager, eventSystem);
            expect(systemA.updateCalled).toBe(true);
            expect(systemB.updateCalled).toBe(false);
            expect(systemC.updateCalled).toBe(false);
            expect(systemD.updateCalled).toBe(true);
        });
    });

    describe('Pipeline definition', () => {
           it('throws an error if END_SUB_PIPELINE is called without a START_SUB_PIPELINE', () => {
               expect(() => {
                   pipelineManager.endSubPipeline();
               }).toThrow();
           });

         it('throws an error if START_SUB_PIPELINE is called within another sub-pipeline', () => {
              pipelineManager.beginSubPipeline();
              expect(() => {
                pipelineManager.beginSubPipeline();
              }).toThrow();
         });
    });

// 4. Multiple Systems and Sub-systems Interaction
    it('handles multiple systems and sub-systems correctly', () => {
        const systemA = new SystemA();
        const systemB = new SystemB();
        const systemC = new SystemC();
        const systemD = new SystemD();
        const systemE = new SystemE();

        pipelineManager.addSystem(systemA);     // A
        pipelineManager.beginSubPipeline()      // Start sub-pipeline
        pipelineManager.addSystem(systemB);     //  -> B
        pipelineManager.addSystem(systemC);     //  -> C
        pipelineManager.endSubPipeline()        // End sub-pipeline
        pipelineManager.addSystem(systemD);     // D
        pipelineManager.beginSubPipeline();     // Start sub-pipeline
        pipelineManager.addSystem(systemE);     //  -> E
        pipelineManager.endSubPipeline();       // End sub-pipeline

        const entity1 = ecManager.createEntity();
        const entity2 = ecManager.createEntity();
        const entity3 = ecManager.createEntity();
        const entity4 = ecManager.createEntity();
        ecManager.addComponent(entity1, ComponentA, new ComponentA());
        ecManager.addComponent(entity2, ComponentB, new ComponentB());
        ecManager.addComponent(entity3, ComponentD, new ComponentD());
        ecManager.addComponent(entity4, ComponentE, new ComponentE());

        pipelineManager.update(1, ecManager, eventSystem);

        // pipelineManager.updateSystems(1, ecManager, eventSystem);
        expect(systemA.updateCalled).toBe(true);
        expect(systemB.updateCalled).toBe(true);
        expect(systemC.updateCalled).toBe(false); // No entity for ComponentC, so systemC doesn't update
        expect(systemD.updateCalled).toBe(true);
        expect(systemE.updateCalled).toBe(true);
    });
});
