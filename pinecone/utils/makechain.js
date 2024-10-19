import { OpenAIChat } from "langchain/llms/openai";
import { LLMChain, ChatVectorDBQAChain, loadQAChain } from "langchain/chains";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { PromptTemplate } from "langchain/prompts";
import { CallbackManager } from "langchain/callbacks";
import { OPENAI_API_KEY } from "../config/pinecone.js";

export const makeChain = (
    vectorstore,
    onTokenStream,
    model = "gpt-4",
    lang = "English",
    recall = false
) => {
    const CONDENSE_PROMPT = PromptTemplate.fromTemplate(
        `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
        Chat History:
        {chat_history}
        Follow Up Input: {question}
        Standalone question:`
    );

    const questionGenerator = new LLMChain({
        llm: new OpenAIChat({
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY,
        }),
        prompt: CONDENSE_PROMPT,
    });

    const QA_PROMPT = recall
        ? PromptTemplate.fromTemplate(
              `You are an AI assistant providing helpful advice. 
            And you need to answer into ${lang}
   
            Question: 
            {question}
        
            Answer in Markdown:`
          )
        : PromptTemplate.fromTemplate(
              `You are an AI assistant providing helpful advice. 
                And you need to answer into ${lang}
                You can make answer based on below context. If you can't fid any information related to user's question from below context, just answer "Hmm".
            
                Question: 
                {question}
                =========
                Conetxt :
                {context}
                =========
                Answer in Markdown:`
          );

    const docChain = loadQAChain(
        new OpenAIChat({
            openAIApiKey: process.env.OPENAI_API_KEY,
            temperature: 0.7,
            modelName: model,
            streaming: Boolean(onTokenStream),
            callbackManager: onTokenStream
                ? CallbackManager.fromHandlers({
                      async handleLLMNewToken(token) {
                          onTokenStream(token);
                          //   console.log(token);
                      },
                  })
                : undefined,
        }),
        { prompt: QA_PROMPT }
    );

    return new ChatVectorDBQAChain({
        vectorstore,
        combineDocumentsChain: docChain,
        questionGeneratorChain: questionGenerator,
        returnSourceDocuments: true,
        k: 3,
    });
};
