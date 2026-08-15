/**
 * Orbit Widget v1 — type documentation only (JSDoc).
 * No runtime exports required for Phase 1.
 *
 * @typedef {Object} WidgetDefinition
 * @property {string} id
 * @property {string} [label]
 * @property {string} [version]
 * @property {object} [defaults]
 * @property {(ctx: WidgetContext) => WidgetInstance | Promise<WidgetInstance>} mount
 *
 * @typedef {Object} WidgetInstance
 * @property {HTMLElement | null} [root]
 * @property {(visible: boolean) => void | Promise<void>} [setVisible]
 * @property {() => HTMLElement[]} [getVisibilityTargets]
 * @property {() => object} [getSnapshot]
 * @property {() => void | Promise<void>} destroy
 *
 * @typedef {Object} WidgetContext
 * @property {string} id
 * @property {Readonly<object>} config
 * @property {{ get(): object, set(partial: object): void, remove(): void }} [storage]
 * @property {(cleanup: () => void | Promise<void>) => () => void} cleanup
 * @property {(type: string, listener: Function) => () => void} [on]
 * @property {(type: string, detail?: object) => void} [emit]
 * @property {{ setVisible(visible: boolean): void }} [actions]
 */

export {};
