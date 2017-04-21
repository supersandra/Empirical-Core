import React from 'react';
const Markdown = require('react-remarkable');
import { connect } from 'react-redux';
import { Link } from 'react-router';
import Question from '../../libs/diagnosticQuestion';
import Textarea from 'react-textarea-autosize';
import icon from '../../img/question_icon.svg';
import _ from 'underscore';
import { hashToCollection } from '../../libs/hashToCollection';
import { submitResponse, clearResponses } from '../../actions/diagnostics.js';
import ReactTransition from 'react-addons-css-transition-group';
import questionActions from '../../actions/questions';
import pathwayActions from '../../actions/pathways';
const C = require('../../constants').default;
import rootRef from '../../libs/firebase';
const sessionsRef = rootRef.child('sessions');
import {
  submitNewResponse,
  incrementChildResponseCount,
  incrementResponseCount,
  getResponsesWithCallback,
  getGradedResponsesWithCallback
} from '../../actions/responses.js';
import RenderQuestionFeedback from '../renderForQuestions/feedbackStatements.jsx';
import RenderQuestionCues from '../renderForQuestions/cues.jsx';
import RenderSentenceFragments from '../renderForQuestions/sentenceFragments.jsx';
import RenderFeedback from '../renderForQuestions/feedback.jsx';
import generateFeedbackString from '../renderForQuestions/generateFeedbackString.js';
import getResponse from '../renderForQuestions/checkAnswer.js';
import handleFocus from '../renderForQuestions/handleFocus.js';
import submitQuestionResponse from '../renderForQuestions/submitResponse.js';
import updateResponseResource from '../renderForQuestions/updateResponseResource.js';
import submitPathway from '../renderForQuestions/submitPathway.js';

import StateFinished from '../renderForQuestions/renderThankYou.jsx';
import AnswerForm from '../renderForQuestions/renderFormForAnswer.jsx';
import TextEditor from '../renderForQuestions/renderTextEditor.jsx';
const feedbackStrings = C.FEEDBACK_STRINGS;

const PlayDiagnosticQuestion = React.createClass({
  getInitialState() {
    return {
      editing: false,
      response: '',
      readyForNext: false,
    };
  },

  componentDidMount() {
    getGradedResponsesWithCallback(
      this.getQuestion().key,
      (data) => {
        this.setState({ responses: data, });
      }
    );
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.playLesson.answeredQuestions.length !== this.props.playLesson.answeredQuestions.length) {
      // this.saveSessionData(nextProps.playLesson);
    }
  },

  getInitialValue() {
    if (this.props.prefill) {
      return this.getQuestion().prefilledText;
    }
  },

  removePrefilledUnderscores() {
    this.setState({ response: this.state.response.replace(/_/g, ''), });
  },

  getQuestion() {
    const { question, } = this.props;
    if (question.key.endsWith('-esp')) {
      question.key = question.key.slice(0, -4);
    }
    return question;
  },

  getResponses() {
    return this.state.responses;
  },

  getResponse2(rid) {
    return this.getResponses()[rid];
  },

  submitResponse(response) {
    submitQuestionResponse(response, this.props, this.state.sessionKey, submitResponse);
  },

  renderSentenceFragments() {
    return <RenderSentenceFragments prompt={this.getQuestion().prompt} />;
  },

  listCuesAsString(cues) {
    const newCues = cues.slice(0);
    return `${newCues.splice(0, newCues.length - 1).join(', ')} or ${newCues.pop()}.`;
  },

  renderFeedback() {
    return (<RenderFeedback
      question={this.props.question} renderFeedbackStatements={this.renderFeedbackStatements}
      sentence="We have not seen this sentence before. Could you please try writing it in another way?"
      getQuestion={this.getQuestion} listCuesAsString={this.listCuesAsString}
    />);
  },

  getErrorsForAttempt(attempt) {
    return _.pick(attempt, ...C.ERROR_TYPES);
  },

  renderFeedbackStatements(attempt) {
    return <RenderQuestionFeedback attempt={attempt} getErrorsForAttempt={this.getErrorsForAttempt} getQuestion={this.getQuestion} />;
  },

  renderCues() {
    return <RenderQuestionCues getQuestion={this.getQuestion} esl />;
  },

  updateResponseResource(response) {
    updateResponseResource(response, this.getQuestion().key, this.getQuestion().attempts, this.props.dispatch);
  },

  submitPathway(response) {
    submitPathway(response, this.props);
  },

  checkAnswer(e) {
    if (this.state.editing) {
      this.removePrefilledUnderscores();
      const response = getResponse(this.getQuestion(), this.state.response, this.getResponses(), this.props.marking);
      this.updateResponseResource(response);
      this.submitResponse(response);
      this.setState({
        editing: false,
        response: '',
      },
        this.nextQuestion()
      );
    }
  },

  toggleDisabled() {
    if (this.state.editing) {
      return '';
    }
    return 'is-disabled';
  },

  handleChange(e) {
    this.setState({ editing: true, response: e, });
  },

  readyForNext() {
    if (this.props.question.attempts.length > 0) {
      const latestAttempt = getLatestAttempt(this.props.question.attempts);
      if (latestAttempt.found) {
        const errors = _.keys(this.getErrorsForAttempt(latestAttempt));
        if (latestAttempt.response.optimal && errors.length === 0) {
          return true;
        }
      }
    }
    return false;
  },

  getProgressPercent() {
    return this.props.question.attempts.length / 3 * 100;
  },

  finish() {
    this.setState({ finished: true, });
  },

  nextQuestion() {
    this.setState({ response: '', });
    this.props.nextQuestion();
    this.setState({ response: '', });
  },

  renderNextQuestionButton(correct) {
    if (correct) {
      return (<button className="button is-outlined is-success" onClick={this.nextQuestion}>Siguiente</button>);
    } else {
      return (<button className="button is-outlined is-warning" onClick={this.nextQuestion}>Siguiente</button>);
    }
  },

  renderMedia() {
    if (this.getQuestion().mediaURL) {
      return (
        <div style={{ marginTop: 15, minWidth: 200, }}>
          <img src={this.getQuestion().mediaURL} />
        </div>
      );
    }
  },

  render() {
    const questionID = this.props.question.key;
    let button;
    if (this.props.question.attempts.length > 0) {
      button = <button className="button student-submit" onClick={this.nextQuestion}>Submit / Enviar</button>;
    } else {
      button = <button className="button student-submit" onClick={this.checkAnswer}>Submit / Enviar</button>;
    }
    if (this.props.question) {
      const instructions = (this.props.question.instructions && this.props.question.instructions !== '') ? this.props.question.instructions : 'Combine the sentences into one sentence. Combinar las frases en una frase.';
      return (
        <div className="student-container-inner-diagnostic">
          <div style={{ display: 'flex', }}>
            <div>
              {this.renderSentenceFragments()}
              {this.renderCues()}
              <div className="feedback-row">
                <img src={icon} style={{ marginTop: 3, }} />
                <p dangerouslySetInnerHTML={{ __html: instructions, }} />
              </div>
            </div>
            {this.renderMedia()}
          </div>

          <ReactTransition transitionName={'text-editor'} transitionAppear transitionLeaveTimeout={500} transitionAppearTimeout={500} transitionEnterTimeout={500}>
            <TextEditor
              className="textarea is-question is-disabled" defaultValue={this.getInitialValue()}
              handleChange={this.handleChange} value={this.state.response} getResponse={this.getResponse2}
              disabled={this.readyForNext()} checkAnswer={this.checkAnswer}
            />
            <div className="question-button-group button-group">
              {button}
            </div>
          </ReactTransition>
        </div>
      );
    } else {
      return (<p>Loading / Cargando...</p>);
    }
  },
});

const getLatestAttempt = function (attempts = []) {
  const lastIndex = attempts.length - 1;
  return attempts[lastIndex];
};

function select(state) {
  return {
    concepts: state.concepts,
    questions: state.questions,
    routing: state.routing,
  };
}
export default connect(select)(PlayDiagnosticQuestion);