import {EntityManager} from "../../../src/modules/gameEngine/ecs/entities/EntityManager";
import {ComponentManager} from "../../../src/modules/gameEngine/ecs/components/ComponentManager";
import {ECManager} from "../../../src/modules/gameEngine/ecs/ECManager";
import {Component} from "../../../src/modules/gameEngine/ecs/components/Component";

class ComponentA extends Component {
    constructor(public value = 0) {super();}
}

class  ComponentB extends Component {
    constructor(public flag = false) {super();}
}

class ComponentC extends Component {
    // ...
}

describe('ECManager', () => {
    let ecManager: ECManager;

    beforeEach(() => {
        const entityManager = new EntityManager();
        const componentManager = new ComponentManager();
        ecManager = new ECManager(entityManager, componentManager);
    });

    describe('Entity Management', () => {
        test('Creating an entity returns a valid entity ID', () => {
            const entityId = ecManager.createEntity();
            expect(typeof entityId).toBe('number');
            expect(ecManager.getAllEntities()).toContain(entityId);
        });

        test('Destroying an entity removes it from the manager', () => {
            const entityId = ecManager.createEntity();
            ecManager.destroyEntity(entityId);
            ecManager.processCommands()
            expect(ecManager.getAllEntities()).not.toContain(entityId);
        });

        test('Getting all entities returns a correct list of active entity IDs', () => {
            const entities = [ecManager.createEntity(), ecManager.createEntity(), ecManager.createEntity()];
            ecManager.destroyEntity(entities[1]);
            ecManager.processCommands();
            const allEntities = ecManager.getAllEntities();
            expect(allEntities.length).toBe(2);
            expect(allEntities).toContain(entities[0]);
            expect(allEntities).toContain(entities[2]);
        });
    });

    describe('Component Management', () => {
        // Assume ComponentA and ComponentB are defined elsewhere
        test('Adding a component to an entity associates the component correctly', () => {
            const entityId = ecManager.createEntity();
            const component = new ComponentA();
            ecManager.addComponent(entityId, ComponentA, component);
            const retrievedComponent = ecManager.getComponent(entityId, ComponentA);
            expect(retrievedComponent).toBe(component);
        });

        test('Removing a component from an entity disassociates the component', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            ecManager.removeComponent(entityId, ComponentA);
            const action = () => ecManager.getComponent(entityId, ComponentA);
            expect(action).toThrow();
        });

        test('Querying for entities with a specific component returns correct results', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            const entitiesWithComponentA = ecManager.getEntitiesWithComponent(ComponentA);
            expect(entitiesWithComponentA).toContain(entityId);
        });

        test('Ensure components can be added, removed, and queried for multiple entities.', () => {
            const entityId1 = ecManager.createEntity();
            const entityId2 = ecManager.createEntity();
            const component1 = new ComponentA();
            const component2 = new ComponentA();
            ecManager.addComponent(entityId1, ComponentA, component1);
            ecManager.addComponent(entityId2, ComponentA, component2);

            expect(ecManager.getComponent(entityId1, ComponentA)).toBe(component1);
            expect(ecManager.getComponent(entityId2, ComponentA)).toBe(component2);

            ecManager.removeComponent(entityId1, ComponentA);
            expect(() => ecManager.getComponent(entityId1, ComponentA)).toThrow();
            expect(ecManager.getComponent(entityId2, ComponentA)).toBe(component2);
        });

        test('Removing all components from an entity clears the entity\'s component state', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            ecManager.addComponent(entityId, ComponentB, new ComponentB());
            ecManager.removeAllComponents(entityId);
            expect(ecManager.getEntitiesWithComponent(ComponentA)).not.toContain(entityId);
            expect(ecManager.getEntitiesWithComponent(ComponentB)).not.toContain(entityId);
        });
    });

    describe('Tag Management', () => {
        test('Adding and querying a tag on an entity works correctly', () => {
            const entityId = ecManager.createEntity();
            ecManager.addTag(entityId, 1); // Assuming tag is represented by a number
            expect(ecManager.hasTag(entityId, 1)).toBe(true);
        });

        test('Removing a tag updates the entity\'s tag state appropriately', () => {
            const entityId = ecManager.createEntity();
            ecManager.addTag(entityId, 1);
            ecManager.removeTag(entityId, 1);
            expect(ecManager.hasTag(entityId, 1)).toBe(false);
        });

        test('Querying entities by tag(s) accurately reflects the current state.', () => {
            const entityId1 = ecManager.createEntity();
            const entityId2 = ecManager.createEntity();
            ecManager.addTag(entityId1, 1);
            ecManager.addTag(entityId2, 2);

            expect(ecManager.hasTag(entityId1, 1)).toBe(true);
            expect(ecManager.hasTag(entityId2, 2)).toBe(true);

            ecManager.removeTag(entityId1, 1);
            expect(ecManager.hasTag(entityId1, 1)).toBe(false);
            expect(ecManager.hasTag(entityId2, 2)).toBe(true);
        });
    });

    describe('Parent-Child Relationships', () => {
        test('Setting and querying parent-child relationship works correctly', () => {
            const parent = ecManager.createEntity();
            const child = ecManager.createEntity();
            ecManager.setParent(child, parent);
            expect(ecManager.getParent(child)).toBe(parent);
            expect(ecManager.getChildren(parent)).toContain(child);
        });

        test('Removing a parent clears the parent-child relationship', () => {
            const parent = ecManager.createEntity();
            const child = ecManager.createEntity();
            ecManager.setParent(child, parent);
            ecManager.removeParent(child);
            expect(ecManager.getParent(child)).toBe(EntityManager['NO_PARENT']);
        });

        test('Querying for children of a specific entity returns the correct list.', () => {
            const parent = ecManager.createEntity();
            const child1 = ecManager.createEntity();
            const child2 = ecManager.createEntity();
            ecManager.setParent(child1, parent);
            ecManager.setParent(child2, parent);

            const children = ecManager.getChildren(parent);
            expect(children).toContain(child1);
            expect(children).toContain(child2);
        });

        test('Edge Case: Removing a parent also affects the children list accurately.', () => {
            const parent = ecManager.createEntity();
            const child = ecManager.createEntity();
            ecManager.setParent(child, parent);
            ecManager.removeParent(child);

            const children = ecManager.getChildren(parent);
            expect(children).not.toContain(child);
        });
    });

    describe('Archetype Management', () => {
        test('Entities with identical component sets are grouped under the same archetype', () => {
            const entityId1 = ecManager.createEntity();
            const entityId2 = ecManager.createEntity();
            ecManager.addComponent(entityId1, ComponentA, new ComponentA());
            ecManager.addComponent(entityId2, ComponentA, new ComponentA());
            // Assuming getArchetypeKey and archetypes are accessible for testing
            const archetypeKey = ecManager['getArchetypeKey']([ComponentA]);
            expect(ecManager['archetypes'].get(archetypeKey)?.size).toBe(2);
            expect(ecManager['archetypes'].get(archetypeKey)).toContain(entityId1);
            expect(ecManager['archetypes'].get(archetypeKey)).toContain(entityId2);
        });

        test('Adding/removing components updates an entity\'s archetype correctly.', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            let archetypeKey = ecManager['getArchetypeKey']([ComponentA]);
            expect(ecManager['archetypes'].get(archetypeKey)).toContain(entityId);

            ecManager.removeComponent(entityId, ComponentA);
            archetypeKey = ecManager['getArchetypeKey']([]);
            expect(ecManager['archetypes'].get(archetypeKey)).toContain(entityId);
        });

        test('Archetype exists but is removed after removing its only entity', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            const archetypeKeyBeforeDestruction = ecManager['getArchetypeKey']([ComponentA]);
            expect(ecManager['archetypes'].get(archetypeKeyBeforeDestruction)?.size).toBe(1);

            ecManager.destroyEntity(entityId);
            const archetype = ecManager['archetypes'].get(archetypeKeyBeforeDestruction);
            expect(archetype).toBeDefined();

            // Process commands to remove the entity
            ecManager.processCommands();
            expect(archetype?.size).toBe(0);
        });

        test('Archetype is removed from the map after the last entity is destroyed', () => {
            const entityId = ecManager.createEntity();
            ecManager.addComponent(entityId, ComponentA, new ComponentA());
            ecManager.destroyEntity(entityId);
            ecManager.processCommands();

            const archetypeKey = ecManager['getArchetypeKey']([ComponentA]);
            expect(ecManager['archetypes'].has(archetypeKey)).toBe(false);
        });
    });

    describe('Command Buffer', () => {
        test('Destroy entity command is buffered and processed correctly', () => {
            const entityId = ecManager.createEntity();
            ecManager.destroyEntity(entityId); // This should buffer the command
            expect(ecManager.getAllEntities()).toContain(entityId); // Entity should still exist before processing
            ecManager.processCommands(); // Process buffered commands
            expect(ecManager.getAllEntities()).not.toContain(entityId); // Entity should no longer exist
        });

        test('Processing commands executes all buffered commands accurately.', () => {
            const entityId = ecManager.createEntity();
            ecManager['enqueueCommand']({ type: 'DestroyEntity', entityId });

            ecManager.processCommands();
            expect(ecManager.getAllEntities()).not.toContain(entityId);
        });
    });

    describe('Query Builder', () => {
        describe('Tag Inclusion and Exclusion', () => {
            let entity1: number;
            let entity2: number;
            let entity3: number;
            let entity4: number;

            beforeEach(() => {
                entity1 = ecManager.createEntity();
                entity2 = ecManager.createEntity();
                entity3 = ecManager.createEntity();
                entity4 = ecManager.createEntity();
                ecManager.addTag(entity1, 1);
                ecManager.addTag(entity2, 1);
                ecManager.addTag(entity2, 2);
                ecManager.addTag(entity3, 2);
                ecManager.addTag(entity3, 3);
                ecManager.addTag(entity4, 4);
            });

            test('Querying with single tag returns correct results', () => {
                const queryResultWithTag1 = ecManager.queryEntities().withTag(1).execute();
                expect(queryResultWithTag1).toStrictEqual([entity1, entity2]);

                const queryResultWithTag2 = ecManager.queryEntities().withTag(2).execute();
                expect(queryResultWithTag2).toStrictEqual([entity2, entity3]);
            });

            test('Querying with multiple tags returns correct results', () => {
                const queryResultWithTags1And2 = ecManager.queryEntities().withTag(1).withTag(2).execute();
                expect(queryResultWithTags1And2).toStrictEqual([entity2]);

                const queryResultWithTags2And3 = ecManager.queryEntities().withTag(2).withTag(3).execute();
                expect(queryResultWithTags2And3).toStrictEqual([entity3]);
            });

            test('Querying without a specific tag returns correct results', () => {
                const queryResultWithoutTag3 = ecManager.queryEntities().withoutTag(3).execute();
                expect(queryResultWithoutTag3).toContain(entity1);
                expect(queryResultWithoutTag3).toContain(entity2);
                expect(queryResultWithoutTag3).not.toContain(entity3);
            });

            test('Combining tag inclusion and exclusion criteria returns correct results', () => {
                const queryResult = ecManager.queryEntities().withTag(1).withoutTag(2).execute();
                expect(queryResult).toStrictEqual([entity1]);

                const queryResult2 = ecManager.queryEntities().withTag(2).withoutTag(1).execute();
                expect(queryResult2).toStrictEqual([entity3]);
            });

            test('Querying with multiple inclusion and exclusion criteria reflects precise entity filtering', () => {
                const queryResultComplex = ecManager.queryEntities().withTag(2).withoutTag(3).execute();
                expect(queryResultComplex).toStrictEqual([entity2]);
            });

            test('Test withTag not overridden by withTags', () => {
                // Special case test
                const queryResult = ecManager.queryEntities()
                    .withTag(1)
                    .withTags([2])
                    .execute();
                expect(queryResult).toStrictEqual([entity2]);
            });

            test('Test withoutTag not overridden by withoutTags', () => {
                // Special case test
                const queryResult = ecManager.queryEntities()
                    .withoutTag(1)
                    .withoutTags([2, 3])
                    .execute();
                expect(queryResult).toStrictEqual([entity4]);
            });
        });

        describe('Parent-Child Relationship', () => {

            let grandParent: number;
            let parent1: number;
            let parent2: number;
            let child1: number;
            let child2: number;
            let child3: number;
            let child4: number;

            beforeEach(() => {
                grandParent = ecManager.createEntity();
                parent1 = ecManager.createEntity();
                parent2 = ecManager.createEntity();
                child1 = ecManager.createEntity();
                child2 = ecManager.createEntity();
                child3 = ecManager.createEntity();
                child4 = ecManager.createEntity();
                ecManager.setParent(parent1, grandParent);
                ecManager.setParent(parent2, grandParent);
                ecManager.setParent(child1, parent1);
                ecManager.setParent(child2, parent1);
                ecManager.setParent(child3, parent2);
                ecManager.setParent(child4, parent2);
            });

            test('Querying With Child returns correct results', () => {
                const queryResult = ecManager.queryEntities()
                    .withChild(child1)
                    .execute();
                expect(queryResult).toStrictEqual([parent1]);

                const queryResult2 = ecManager.queryEntities()
                    .withChild(child3)
                    .execute();
                expect(queryResult2).toStrictEqual([parent2]);
            });

            test('Querying With Children returns correct results', () => {
                const queryResult = ecManager.queryEntities()
                    .withChildren([child1, child2])
                    .execute();
                expect(queryResult).toStrictEqual([parent1]);

                const queryResult2 = ecManager.queryEntities()
                    .withChildren([child3, child4])
                    .execute();
                expect(queryResult2).toStrictEqual([parent2]);
            });

            test('Querying With Parent returns correct results', () => {
                const queryResult = ecManager.queryEntities()
                    .withParent(parent1)
                    .execute();
                expect(queryResult).toStrictEqual([child1, child2]);

                const queryResult2 = ecManager.queryEntities()
                    .withParent(parent2)
                    .execute();
                expect(queryResult2).toStrictEqual([child3, child4]);

                const queryResult3 = ecManager.queryEntities()
                    .withParent(grandParent)
                    .execute();
                expect(queryResult3).toStrictEqual([parent1, parent2]);
            });

            test('Querying With Parent And Children returns correct results', () => {
                const queryResult = ecManager.queryEntities()
                    .withParent(grandParent)
                    .withChildren([child1, child2])
                    .execute();
                expect(queryResult).toStrictEqual([parent1]);
            });

            test('Querying With Parent And Without Children returns correct results', () => {
                const queryResult = ecManager.queryEntities()
                    .withParent(grandParent)
                    .withoutChildren([child3, child4])
                    .execute();
                expect(queryResult).toStrictEqual([parent1]);
            });

            describe('Querying with multiple parent-child inclusion and exclusion criteria returns correct results', () => {

                test('Querying for Parent 1 via grandParent and children 1 and 3', () => {
                    const queryResult = ecManager.queryEntities()
                        .withParent(grandParent)
                        .withChild(child1)
                        .withoutChild(child3)
                        .execute();
                    expect(queryResult).toStrictEqual([parent1]);
                });

                test('Querying for Parent 1 via grandParent and children 3 and 4', () => {
                    const queryResult = ecManager.queryEntities()
                        .withParent(grandParent)
                        .withoutChildren([child3, child4])
                        .execute();
                    expect(queryResult).toStrictEqual([parent1]);
                });

                test('Querying for non existent parent-child relationship returns correct results', () => {
                    const queryResult = ecManager.queryEntities()
                        .withParent(grandParent)
                        .withChildren([child1, child3]) // This should not exist
                        .execute();
                    expect(queryResult).toStrictEqual([]);
                });

                test('Querying for non existent parent-child relationship returns correct results', () => {
                    const queryResult = ecManager.queryEntities()
                        .withParent(grandParent)
                        .withChildren([child1, child2]) // Parent 1 has children 1 and 2
                        .withoutChild(child1)
                        .execute();
                    expect(queryResult).toStrictEqual([]);
                });

                test('Test withChild not overridden by withChildren', () => {
                    // Special case test
                    const queryResult = ecManager.queryEntities()
                        .withChild(child1)
                        .withChildren([child3])
                        .execute();
                    expect(queryResult).toStrictEqual([])
                });
            });
        });

        describe('Querying by Component', () => {
            let entity1: number;
            let entity2: number;
            let entity3: number;

            beforeEach(() => {
                entity1 = ecManager.createEntity();
                entity2 = ecManager.createEntity();
                entity3 = ecManager.createEntity();
                ecManager.addComponent(entity1, ComponentA, new ComponentA());
                ecManager.addComponent(entity2, ComponentB, new ComponentB());
                ecManager.addComponent(entity3, ComponentC, new ComponentC());
            });

            test('Querying entities by including multiple components returns accurate results', () => {
                const queryResult = ecManager.queryEntities().withComponent(ComponentA).withComponent(ComponentB).execute();
                // Assuming no entity has both ComponentA and ComponentB, expecting an empty array
                expect(queryResult).toStrictEqual([]);

                ecManager.addComponent(entity1, ComponentB, new ComponentB()); // Adding ComponentB to entity1
                const queryResultUpdate = ecManager.queryEntities().withComponent(ComponentA).withComponent(ComponentB).execute();
                expect(queryResultUpdate).toStrictEqual([entity1]);
            });

            test('Excluding specific components accurately filters entities', () => {
                const queryResult = ecManager.queryEntities().withoutComponent(ComponentC).execute();
                expect(queryResult).not.toContain(entity3); // entity3 has ComponentC and should be excluded
                expect(queryResult).toContain(entity1);
                expect(queryResult).toContain(entity2);
            });

            test('Combining component inclusion and exclusion for precise querying', () => {
                ecManager.addComponent(entity1, ComponentC, new ComponentC()); // Entity1 now has ComponentA and ComponentC
                const queryResultComplex = ecManager.queryEntities().withComponent(ComponentA).withoutComponent(ComponentC).execute();
                // Entity1 should be excluded because it has ComponentC, even though it also has ComponentA
                expect(queryResultComplex).toStrictEqual([]);
            });

            describe('Querying by Component with Conditions', () => {

                beforeEach(() => {
                    entity1 = ecManager.createEntity();
                    entity2 = ecManager.createEntity();
                    entity3 = ecManager.createEntity();
                    ecManager.addComponent(entity1, ComponentA, new ComponentA(10));
                    ecManager.addComponent(entity2, ComponentA, new ComponentA(20));
                    ecManager.addComponent(entity2, ComponentB, new ComponentB(true));
                    ecManager.addComponent(entity3, ComponentB, new ComponentB(false));
                });

                test('Filtering entities with component condition', () => {
                    const queryResult = ecManager.queryEntities()
                        .withComponentCondition(ComponentA, component => component.value > 15)
                        .execute();
                    expect(queryResult).toStrictEqual([entity2]);

                    const queryResult2 = ecManager.queryEntities()
                        .withComponentCondition(ComponentB, component => component.flag === true)
                        .execute();
                    expect(queryResult2).toStrictEqual([entity2]);
                });

                test('Combining component conditions with inclusion and exclusion filters', () => {
                    const queryResult = ecManager.queryEntities()
                        .withComponent(ComponentA)
                        .withComponentCondition(ComponentB, component => component.flag === true)
                        .withoutComponent(ComponentC) // Assuming ComponentC exists
                        .execute();
                    expect(queryResult).toStrictEqual([entity2]); // Only entity2 meets all criteria
                });

                test('Querying with conflicting component conditions', () => {
                    const queryResult = ecManager.queryEntities()
                        .withComponentCondition(ComponentA, component => component.value < 15)
                        .withComponentCondition(ComponentA, component => component.value > 15)
                        .execute();
                    expect(queryResult).toStrictEqual([]); // No entity meets conflicting conditions
                });

                test('Ensuring entities without the component are excluded in condition checks', () => {
                    const queryResult = ecManager.queryEntities()
                        .withComponentCondition(ComponentA, component => component.value > 5)
                        .execute();
                    expect(queryResult).not.toContain(entity3); // Entity3 does not have ComponentA and should be excluded
                });
            });
        });
    });
});
