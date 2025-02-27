import { Application } from '@hotwired/stimulus';
import LiveController from '../src/live_controller';
import { waitFor } from '@testing-library/dom';
import fetchMock from 'fetch-mock-jest';
import { htmlToElement } from '../src/dom_utils';

let activeTest: FunctionalTest|null = null;
let unmatchedFetchErrors: Array<{url: string, method: string, body: any, headers: any}> = [];

// manually error on unmatched request for readability
fetchMock.config.warnOnFallback = false;
fetchMock.catch((url: string, response: any) => {
    unmatchedFetchErrors.push({
        url,
        method: response.method,
        body: response.body,
        headers: response.headers,
    });
});

let application: Application;

export function shutdownTest() {
    if (!activeTest) {
        // no test was run, apparently
        return;
    }

    const test = activeTest;
    activeTest = null;

    unmatchedFetchErrors.forEach((unmatchedFetchError) => {
        const urlParams = new URLSearchParams(unmatchedFetchError.url.substring(unmatchedFetchError.url.indexOf('?')));
        const requestInfo = [];
        requestInfo.push(` METHOD: ${unmatchedFetchError.method}`);
        requestInfo.push(`  HEADERS: ${JSON.stringify(unmatchedFetchError.headers)}`);
        requestInfo.push(`  DATA: ${unmatchedFetchError.method === 'GET' ? urlParams.get('data') : unmatchedFetchError.body}`);

        console.log(`UNMATCHED request was made with the following info:`, "\n", requestInfo.join("\n"));
    });
    unmatchedFetchErrors = [];

    let allMocksRequestsCalled = true;
    test.mockedAjaxCalls.forEach((mock => {
        if (!mock.fetchMock) {
            throw new Error('You must call .init() after calling expectsAjaxCall() to fully initialize the mock Ajax call.')
        }

        if (!fetchMock.called(mock.routeName)) {
            console.log('EXPECTED request was never made matching the following info:', '\n', mock.getVisualSummary());
            allMocksRequestsCalled = false;
        }
    }));

    // this + the above warnings - has a nicer output than using "fetchMock.done()".
    if (!allMocksRequestsCalled || unmatchedFetchErrors.length > 0) {
        fetchMock.reset();

        throw new Error('Some mocked requests were never called or unexpected calls were made.');
    }

    // only possible if someone uses fetchMock directly, but here just in case
    if (!fetchMock.done()) {
        fetchMock.reset();

        throw new Error('Some mocked requests were never called.');
    }

    fetchMock.reset();
}

class FunctionalTest {
    controller: LiveController;
    element: HTMLElement;
    initialData: any;
    template: (data: any) => string;
    mockedAjaxCalls: Array<MockedAjaxCall> = [];

    constructor(controller: LiveController, element: HTMLElement, initialData: any, template: (data: any) => string) {
        this.controller = controller;
        this.element = element;
        this.initialData = initialData;
        this.template = template;
    }

    expectsAjaxCall = (method: string): MockedAjaxCall => {
        const mock = new MockedAjaxCall(method, this);
        this.mockedAjaxCalls.push(mock);

        return mock;
    }

    queryByDataModel(modelName: string): HTMLElement {
        const element = this.element.querySelector(`[data-model$="${modelName}"]`);
        if (!element) {
            throw new Error(`Could not find element with data-model="${modelName}"`);
        }

        return element as HTMLElement;
    }

    queryByNameAttribute(modelName: string): HTMLElement {
        const element = this.element.querySelector(`[name="${modelName}"]`);
        if (!element) {
            throw new Error(`Could not find element with name="${modelName}"`);
        }

        return element as HTMLElement;
    }
}
class MockedAjaxCall {
    method: string;
    test: FunctionalTest;
    expectedSentData?: any;
    expectedActionName?: string;
    expectedActionArgs: any = null;
    expectedHeaders: any = {};
    changeDataCallback?: (data: any) => void;
    template?: (data: any) => string
    options: any = {};
    fetchMock?: typeof fetchMock;
    routeName?: string;
    customResponseStatusCode?: number;
    customResponseHTML?: string;

    constructor(method: string, test: FunctionalTest) {
        this.method = method.toUpperCase();
        this.test = test;
    }

    /**
     * Pass the "data" that is expected to be sent on the Ajax request
     */
    expectSentData = (data: any): MockedAjaxCall => {
        this.checkInitialization('expectSentData');

        this.expectedSentData = data;

        return this;
    }

    /**
     * Call if the "server" will change the data before it re-renders
     */
    serverWillChangeData = (callback: (data: any) => void): MockedAjaxCall => {
        this.checkInitialization('serverWillChangeData');
        this.changeDataCallback = callback;

        return this;
    }

    delayResponse = (milliseconds: number): MockedAjaxCall => {
        this.checkInitialization('delayResponse');
        this.options.delay = milliseconds;

        return this;
    }

    expectActionCalled(actionName: string, args: any = null): MockedAjaxCall {
        this.checkInitialization('expectActionName');
        this.expectedActionName = actionName;
        this.expectedActionArgs = args;

        return this;
    }

    init = (): void => {
        if (this.fetchMock) {
            throw new Error('Cannot call call init() multiple times.');
        }

        if (!this.expectedSentData) {
            throw new Error('expectSentData() must be called before init().')
        }

        const finalServerData = JSON.parse(JSON.stringify(this.expectedSentData));

        if (this.changeDataCallback) {
            this.changeDataCallback(finalServerData);
        }

        // use custom template, or the main one
        const template = this.template ? this.template : this.test.template;

        let response;
        if (this.customResponseStatusCode) {
            response = {
                body: this.customResponseHTML,
                status: this.customResponseStatusCode
            }
        } else {
            response = {
                body: template(finalServerData),
                headers: {
                    'Content-Type': 'application/vnd.live-component+html'
                }
            }
        }

        this.fetchMock = fetchMock.mock(
            this.getMockMatcher(),
            response,
            this.options
        );
    }

    willReturn(template: (data: any) => string): MockedAjaxCall {
        this.checkInitialization('willReturn');
        this.template = template;

        return this;
    }

    expectHeader(headerName: string, value: string): MockedAjaxCall {
        this.checkInitialization('expectHeader');
        this.expectedHeaders[headerName] = value;

        return this;
    }

    serverWillReturnCustomResponse(statusCode: number, responseHTML: string): MockedAjaxCall {
        this.checkInitialization('serverWillReturnAnError');
        this.customResponseStatusCode = statusCode;
        this.customResponseHTML = responseHTML;

        return this;
    }

    getVisualSummary(): string {
        const requestInfo = [];
        requestInfo.push(` METHOD: ${this.method}`);
        if (Object.keys(this.expectedHeaders).length > 0) {
            requestInfo.push(`  HEADERS: ${JSON.stringify(this.expectedHeaders)}`);
        }
        requestInfo.push(`  DATA: ${JSON.stringify(this.expectedSentData)}`);
        if (this.expectedActionName) {
            requestInfo.push(`  Expected URL to contain action /${this.expectedActionName}`)
            if (this.expectedActionArgs) {
                requestInfo.push(`  Expected action arguments in URL matching ${this.calculateArgsQueryString()}`)
            }
        }

        return requestInfo.join("\n");
    }

    // https://www.wheresrhys.co.uk/fetch-mock/#api-mockingmock_matcher
    private getMockMatcher(): any {
        if (!this.expectedSentData) {
            throw new Error('expectedSentData not set yet');
        }

        const matcherObject: any = { method: this.method };

        if (Object.keys(this.expectedHeaders).length > 0) {
            matcherObject.headers = this.expectedHeaders;
        }

        if (this.method === 'GET') {
            const params = new URLSearchParams({
                data: JSON.stringify(this.expectedSentData)
            });
            matcherObject.url = `end:?${params.toString()}`;
        } else {
            matcherObject.body = this.expectedSentData;
            if (this.expectedActionName) {
                matcherObject.functionMatcher = (url: string) => {
                    // match the "/actionName" part in the URL
                    if (!url.match(new RegExp(`/${this.expectedActionName}?`))) {
                        return false;
                    }

                    // look for action arguments
                    if (this.expectedActionArgs) {
                        if (!url.includes(this.calculateArgsQueryString())) {
                            return false;
                        }
                    }

                    return true;
                }
            }
        }

        this.routeName = `route-${this.test.mockedAjaxCalls.length}`;
        matcherObject.name = this.routeName;

        return matcherObject;
    }

    private calculateArgsQueryString(): string {
        const urlParams = new URLSearchParams();
        urlParams.set('args', new URLSearchParams(this.expectedActionArgs).toString());

        return urlParams.toString();
    }

    private checkInitialization = (method: string): void => {
        if (this.fetchMock) {
            throw new Error(`Cannot call ${method}() after MockedAjaxCall is initialized`);
        }
    }
}

export async function createTest(data: any, template: (data: any) => string): Promise<FunctionalTest> {
    const testData = await startStimulus(template(data));

    const test = new FunctionalTest(testData.controller, testData.element, data, template);
    if (activeTest) {
        throw new Error('Cannot create a new test: a test is already active');
    }
    activeTest = test;

    return test;
}

export async function startStimulus(element: string|HTMLElement) {
    // start the Stimulus app just once per test suite
    if (!application) {
        application = Application.start();
        application.register('live', LiveController);
    }

    if (!(element instanceof HTMLElement)) {
        element = htmlToElement(element);
    }
    document.body.innerHTML = '';
    document.body.appendChild(element);

    const controllerElement = getControllerElement(element);

    await waitFor(() => application.getControllerForElementAndIdentifier(controllerElement, 'live'));
    const controller = application.getControllerForElementAndIdentifier(controllerElement, 'live') as LiveController;

    return {
        controller,
        element: controllerElement
    }
}

const getControllerElement = (container: HTMLElement): HTMLElement => {
    if (container.dataset.controller === 'live') {
        return container;
    }

    const element = container.querySelector('[data-controller="live"]');

    if (!element || !(element instanceof HTMLElement)) {
        throw new Error('Could not find controller element');
    }

    return element;
};

const dataToJsonAttribute = (data: any): string => {
    const container = document.createElement('div');
    container.dataset.foo = JSON.stringify(data);

    const matches = container.outerHTML.match(/data-foo="(.+)"/);

    if (!matches) {
        throw new Error('Match is missing');
    }

    // returns the now-escaped string, ready to be used in an HTML attribute
    return matches[1]
}

export function initComponent(data: any, controllerValues: any = {}) {
    return `
        data-controller="live"
        data-live-url-value="http://localhost/components/_test_component_${Math.round(Math.random() * 1000)}"
        data-live-data-value="${dataToJsonAttribute(data)}"
        ${controllerValues.debounce ? `data-live-debounce-value="${controllerValues.debounce}"` : ''}
        ${controllerValues.csrf ? `data-live-csrf-value="${controllerValues.csrf}"` : ''}
    `;
}
