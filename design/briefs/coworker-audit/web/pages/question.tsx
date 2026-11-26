// A sketch of src/web/pages/question.tsx, the rebuilt "question as a page". Not compiled.
// Every line that reads or writes goes through something generated: the reference `useAsk` and `<Ask.*>` (K46 call
// 9, new), and the piece `<AskAnswer.*>` for the operation `ask.answer` (K29). The layout and the words are the page's.
import { Ask, useAsk } from "@coworker/web/ask.react.tsx";                 // new: the reference per thing
import { AskAnswer } from "@coworker/web/ask/answer.react.tsx";           // K29: the piece per operation
import { Header, Rail, OptionCard } from "../components/record/index.ts"; // the app's own, on UI SDK and the theme

export const Question = ({ ask: id }: { ask: string }) => {
  const ask = useAsk(id); // state, the fields this caller may see, what it may do, what it waits for; live
  return (
    <Ask.Root id={id}>
      <Header title={<Ask.Field name="title" />} status={<Ask.State />} />
      <section aria-label="What happened"><Ask.Field name="shows" /></section>
      <AskAnswer.Root subject={{ ask: id }}>
        {ask.fields.options.map((o, i) => (
          <OptionCard key={o.label} letter={"ABCDEFG"[i]} option={o} recommended={o.label === ask.fields.recommends}>
            <AskAnswer.Submit value={o.label}>Choose {"ABCDEFG"[i]}</AskAnswer.Submit>
          </OptionCard>
        ))}
        <AskAnswer.Answer label="Or answer in your own words" />
        <AskAnswer.Refusal />
        <AskAnswer.Submit>Send answer</AskAnswer.Submit>
      </AskAnswer.Root>
      <Rail>
        <Ask.Needs />                {/* "Waiting on you since 10:42, by Friday" */}
        <Ask.Field name="about" />   {/* the task it blocks, as a typed link from generated/app */}
      </Rail>
    </Ask.Root>
  );
};
