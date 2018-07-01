# About

Sentitude is a Chrome Extension that performs sentiment analysis on webpages and selections. 

## Technologies 

Sentitude makes use of two dictionaries when analyzing pages- [SenticNet 5](http://sentic.net/about/) and [AFINN-111](http://www2.imm.dtu.dk/pubdb/views/publication_details.php?id=6010). SenticNet 5 is the latest, released in 2018 ([read the paper here](http://sentic.net/senticnet-5.pdf)) and provides 100,000 concepts, each of which has been assigned a number of values, notably polarity, attention value, pleasantness, sensitivity, aptitude value, and a number of other semantics values. For example, the entry `betray` in the SenticNet 5 dictionary looks like this: 
```json
{
    "betray": [
        "-0.50",
        "-0.18",
        "0.038",
        "-0.34",
        "#sadness",
        "#disgust",
        "negative",
        "-0.17",
        "leave_out",
        "unattractive",
        "cause_suffer",
        "loathing",
        "lose_team"
    ],
}
```
SenticNet 5 was created using a [recurrent neural network](https://en.wikipedia.org/wiki/Recurrent_neural_network) and the ["bag of concepts"](http://sentic.net/jumping-nlp-curves.pdf) model. The polarities of the words are inferred from a number of factors, most importantly the concept conveyed by the sentence and its collection of words. 

In addition, Sentitude makes use of the AFINN-111 dictionary. This dictionary is older, released in 2011 and containing 2,477 entries. Unlike the SenticNet dictionary, AFINN-111 was created manually by assigning a polarity value to each word or phrase based off of a number of factors. You can find out more by [reading the paper here](https://arxiv.org/pdf/1103.2903.pdf). The entry `betray` in the AFINN-111 dictionary looks like this:
```json
{
    "betray":  -3,
}
``` 
Both of these dictionaries are useful when determining the sentiment of a piece of text, as each gives a different result. Neither is perfect, so the sentiment value that Sentitude produces is a combination of the two.  

### How Sentitude Works

Sentitude splits a text into "tokens"- individual words or phrases that have values attached. For example, consider the following sentence:
```
A lot of food can bring good fortune. 
```
Instead of splitting this sentence into eight separate words, Sentitude searches for the largest combination of words that can be combined that have an entry in a dictionary. In this case, the result would be split up into four tokens, like this:
```
[A lot of food] [can] [bring] [good fortune].
```
Now an aggregate score is created through a summation of all the token values, in this case the polarity:
```
[0.049] + [0] + [0.121] + [0.847]
```
The single word `can` was not in the dictionary, so it is given a token value of zero. Adding the values and dividing by the number of tokens:
```
0.049 + 0 + 0.121 + 0.847 = 1.017 / 4 = 0.25425
``` 
Thus, this sentence has a raw polarity of 0.25, which is then scaled on the range [-100, 100] and averaged with the polarity value obtained by following a similar process with the AFINN-111 dictionary. The average of the two is weighted more heavily towards the SenticNet dictionary by default, but this can be changed in the Sentitude options panel. The final sentiment of this sentence after averaging would be around `+23`, a rather positive score. 

#### Negation & Lemmatization

It is worth noting that this approach can be easily broken. For example, the sentence:
```
I don't want to go.
```
Would result in a positive score. This is why Sentitude includes a list of negators, which are compared against the tokens in a sentence. If one is found, in this case `don't`, the value of the following token, `want to go`, is inverted. Adding the token values would look like the following:
```
[I] + [don't] + -[want to go]
``` 
In addition, not all tenses of words are included in the dictionaries. For example, given the token `betrayed`, no value would be present. For this reason, Sentitude makes use of the [Porter Stemming Algorithm](https://tartarus.org/martin/PorterStemmer/) to normalize words. This way, literal words that are not in the dictionaries can still be identified by removing their suffixes and using their stems. 

## Licence 

Sentitude is licenced under the MIT Licence. 

Copyright (©) 2018 Christian Broms
