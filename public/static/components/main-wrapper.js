class MainWrapper extends Component {
  static styleSheet = '/static/components/main-wrapper.css';

  connectedCallback() {
    // test increment event
    this.addEventListener('click', () => {
      this.dispatchEvent(new ReduxEvents.Dispatch({ type: 'increment' }));
    });

    window.addEventListener(ReduxEventTypes.stateChange, e => {
      console.log(ReduxEventTypes.stateChange, e)
    });
  }
}

window.customElements.define('main-wrapper', MainWrapper);
