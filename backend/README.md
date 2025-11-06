# API
## Join Queue
> Adds a user to the matchmaking queue.
>> URL: /api/queue/join
>> Method: POST

## Leave Queue
> Removes a user from the matchmaking queue
>> URL: /api/queue/leave
>> Method: POST

## Check Queue Status
> Checks if user is in queue and attempts to find a match.
>> URL: /api/queue/status
>> Method: GET

# Database Schema
## Queue Collection
<code>
userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
},
    joinedAt: {
    type: Date,
    default: Date.now
},
    preferences: {
    type: Object,
    default: {} // expandable for iterations implementing matching preferences
}
</code>

## Chat Session
<code>
participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
}],
active: {
    type: Boolean,
    default: true
},
startedAt: {
    type: Date,
    default: Date.now
},
endedAt: {
    type: Date
}
</code>

# Testing
Run using `npm run dev`
Test with postman and create the API calls and monitor via mongodb compass