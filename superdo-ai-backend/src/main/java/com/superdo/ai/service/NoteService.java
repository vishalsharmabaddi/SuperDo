package com.superdo.ai.service;

import com.superdo.ai.dto.NoteRequest;
import com.superdo.ai.entity.Note;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.NoteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NoteService {

    private static final Logger log = LoggerFactory.getLogger(NoteService.class);

    private final NoteRepository noteRepository;
    private final UserService userService;

    public NoteService(NoteRepository noteRepository, UserService userService) {
        this.noteRepository = noteRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<Note> list(Long userId, String query) {
        if (query != null && !query.isBlank()) {
            return noteRepository.searchByUserId(userId, query.trim());
        }
        return noteRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Transactional
    public Note create(Long userId, NoteRequest request) {
        Note note = new Note();
        note.setUser(userService.getRequiredUser(userId));
        applyRequest(note, request);
        Note saved = noteRepository.save(note);
        log.debug("Note created id={} for userId={}", saved.getId(), userId);
        return saved;
    }

    @Transactional
    public Note update(Long userId, Long id, NoteRequest request) {
        Note note = getOwned(userId, id);
        applyRequest(note, request);
        Note saved = noteRepository.save(note);
        log.debug("Note updated id={} for userId={}", id, userId);
        return saved;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        noteRepository.delete(getOwned(userId, id));
        log.debug("Note deleted id={} for userId={}", id, userId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the note only if it belongs to the requesting user.
     * Returns 404 for both "not found" and "wrong owner" to prevent
     * resource enumeration by unauthenticated callers.
     */
    private Note getOwned(Long userId, Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Note not found"));
        if (!note.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Note not found");
        }
        return note;
    }

    private void applyRequest(Note note, NoteRequest request) {
        note.setTitle(request.getTitle().trim());
        note.setContent(request.getContent());
        note.setTags(request.getTags());
        note.setReminderDate(request.getReminderDate());
    }
}
